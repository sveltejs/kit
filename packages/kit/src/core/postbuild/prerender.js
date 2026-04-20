/** @import { Logger, PrerenderDependency, Prerendered, PrerenderMap, ServerMetadata, ValidatedConfig } from 'types' */
/** @import { PluginOption } from 'vite' */
/** @import { SerialisedResponse } from '../../exports/vite/types.js' */
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import * as devalue from 'devalue';
import { mkdirp, walk } from '../../utils/filesystem.js';
import { noop } from '../../utils/functions.js';
import { decode_uri, is_root_relative, resolve } from '../../utils/url.js';
import { escape_for_regexp, escape_html } from '../../utils/escape.js';
import { logger } from '../utils.js';
import { get_route_segments } from '../../utils/routing.js';
import { queue } from './queue.js';
import { crawl } from './crawl.js';
import generate_fallback from './fallback.js';
import { posixify } from '../../utils/os.js';
import { create_app_dir_matcher } from '../../exports/vite/dev/index.js';
import { create_build_server } from '../../exports/vite/build/vite_server.js';

// https://html.spec.whatwg.org/multipage/browsing-the-web.html#scrolling-to-a-fragment
// "If fragment is the empty string, then return the special value top of the document."
// ...and
// "If decodedFragment is an ASCII case-insensitive match for the string 'top', then return the top of the document."
const SPECIAL_HASHLINKS = new Set(['', 'top']);

const prerender_entry = import.meta.resolve('./prerender_entry.js');

/**
 * @param {object} opts Arguments must be serialisable via the structured clone algorithm
 * @param {ValidatedConfig} opts.svelte_config
 * @param {string} opts.out
 * @param {string} opts.manifest_path
 * @param {ServerMetadata} opts.metadata
 * @param {boolean} opts.verbose
 * @param {string} opts.root
 */
export default async function prerender({
	svelte_config,
	out,
	manifest_path,
	metadata,
	verbose
}) {
	/**
	 * @template {{message: string}} T
	 * @template {Omit<T, 'message'>} K
	 * @param {Logger} log
	 * @param {'fail' | 'warn' | 'ignore' | ((details: T) => void)} input
	 * @param {(details: K) => string} format
	 * @returns {(details: K) => void}
	 */
	function normalise_error_handler(log, input, format) {
		switch (input) {
			case 'fail':
				return (details) => {
					throw new Error(format(details));
				};
			case 'warn':
				return (details) => {
					log.error(format(details));
				};
			case 'ignore':
				return noop;
			default:
				// @ts-expect-error TS thinks T might be of a different kind, but it's not
				return (details) => input({ ...details, message: format(details) });
		}
	}

	const OK = 2;
	const REDIRECT = 3;

	/** @type {Prerendered} */
	const prerendered = {
		pages: new Map(),
		assets: new Map(),
		redirects: new Map(),
		paths: []
	};

	/** @type {PrerenderMap} */
	const prerender_map = new Map();

	for (const [id, { prerender }] of metadata.routes) {
		if (prerender !== undefined) {
			prerender_map.set(id, prerender);
		}
	}

	if (svelte_config.kit.router.type === 'hash') {
		const fallback = await generate_fallback({
			svelte_config,
			manifest_path,
			out
		});

		const file = output_filename('/', true);
		const dest = `${out}/prerendered/pages/${file}`;

		mkdirp(dirname(dest));
		writeFileSync(dest, fallback);

		prerendered.pages.set('/', { file });

		return { prerendered, prerender_map };
	}

	/** @type {Logger} */
	const log = logger({ verbose });

	/** @type {Map<string, string>} */
	const saved = new Map();

	const handle_http_error = normalise_error_handler(
		log,
		svelte_config.kit.prerender.handleHttpError,
		({ status, path, referrer, referenceType }) => {
			const message =
				status === 404 && !path.startsWith(svelte_config.kit.paths.base)
					? `${path} does not begin with \`base\`, which is configured in \`paths.base\` and can be imported from \`$app/paths\` - see https://svelte.dev/docs/kit/configuration#paths for more info`
					: path;

			return `${status} ${message}${referrer ? ` (${referenceType} from ${referrer})` : ''}`;
		}
	);

	const handle_missing_id = normalise_error_handler(
		log,
		svelte_config.kit.prerender.handleMissingId,
		({ path, id, referrers }) => {
			return (
				`The following pages contain links to ${path}#${id}, but no element with id="${id}" exists on ${path} - see the \`handleMissingId\` option in https://svelte.dev/docs/kit/configuration#prerender for more info:` +
				referrers.map((l) => `\n  - ${l}`).join('')
			);
		}
	);

	const handle_entry_generator_mismatch = normalise_error_handler(
		log,
		svelte_config.kit.prerender.handleEntryGeneratorMismatch,
		({ generatedFromId, entry, matchedId }) => {
			return `The entries export from ${generatedFromId} generated entry ${entry}, which was matched by ${matchedId} - see the \`handleEntryGeneratorMismatch\` option in https://svelte.dev/docs/kit/configuration#prerender for more info.`;
		}
	);

	const handle_not_prerendered_route = normalise_error_handler(
		log,
		svelte_config.kit.prerender.handleUnseenRoutes,
		({ routes }) => {
			const list = routes.map((id) => `  - ${id}`).join('\n');
			return `The following routes were marked as prerenderable, but were not prerendered because they were not found while crawling your app:\n${list}\n\nSee the \`handleUnseenRoutes\` option in https://svelte.dev/docs/kit/configuration#prerender for more info.`;
		}
	);

	const q = queue(svelte_config.kit.prerender.concurrency);

	/**
	 * @param {string} path
	 * @param {boolean} is_html
	 */
	function output_filename(path, is_html) {
		const file = path.slice(svelte_config.kit.paths.base.length + 1) || 'index.html';

		if (is_html && !file.endsWith('.html')) {
			return file + (file.endsWith('/') ? 'index.html' : '.html');
		}

		return file;
	}

	const files = new Set(walk(`${out}/client`).map(posixify));
	files.add(`${svelte_config.kit.appDir}/env.js`);

	const immutable = `${svelte_config.kit.appDir}/immutable`;
	if (existsSync(`${out}/server/${immutable}`)) {
		for (const file of walk(`${out}/server/${immutable}`)) {
			files.add(posixify(`${svelte_config.kit.appDir}/immutable/${file}`));
		}
	}

	const remote_prefix = `${svelte_config.kit.paths.base}/${svelte_config.kit.appDir}/remote/`;

	const seen = new Set();
	const written = new Set();

	/** @type {Map<string, Set<string>>} */
	const expected_hashlinks = new Map();

	/** @type {Map<string, string[]>} */
	const actual_hashlinks = new Map();

	/**
	 * @param {string | null} referrer
	 * @param {string} decoded
	 * @param {string} [encoded]
	 * @param {string} [generated_from_id]
	 */
	function enqueue(referrer, decoded, encoded, generated_from_id) {
		if (seen.has(decoded)) return;
		seen.add(decoded);

		const file = decoded.slice(svelte_config.kit.paths.base.length + 1);
		if (files.has(file)) return;

		return q.add(() => visit(decoded, encoded || encodeURI(decoded), referrer, generated_from_id));
	}

	/**
	 * @param {string} decoded
	 * @param {string} encoded
	 * @param {string?} referrer
	 * @param {string} [generated_from_id]
	 */
	async function visit(decoded, encoded, referrer, generated_from_id) {
		if (!decoded.startsWith(svelte_config.kit.paths.base)) {
			handle_http_error({ status: 404, path: decoded, referrer, referenceType: 'linked' });
			return;
		}

		/** @type {PromiseWithResolvers<Map<string, PrerenderDependency>>} */
		const prerender_dependencies = Promise.withResolvers();

		/** @param {Record<string, { response: SerialisedResponse; body: null | string | Uint8Array }>} dependencies */
		const listener = (dependencies) => {
			/** @type {Map<string, PrerenderDependency>} */
			const deserialised = new Map();
			for (const [path, dependency] of Object.entries(dependencies)) {
				deserialised.set(path, {
					response: new Response(dependency.response.body, {
						headers: dependency.response.headers,
						status: dependency.response.status,
						statusText: dependency.response.statusText
					}),
					body: dependency.body
				});
			}
			prerender_dependencies.resolve(deserialised);
		};

		const event = `sveltekit:prerender-dependencies-${encoded}`;
		vite.environments.ssr.hot.on(event, listener);
		const response = await fetch(`http://localhost:${port}${encoded}`);
		vite.environments.ssr.hot.off(event, listener);

		const encoded_id = response.headers.get('x-sveltekit-routeid');
		const decoded_id = encoded_id && decode_uri(encoded_id);
		if (
			decoded_id !== null &&
			generated_from_id !== undefined &&
			decoded_id !== generated_from_id
		) {
			handle_entry_generator_mismatch({
				generatedFromId: generated_from_id,
				entry: decoded,
				matchedId: decoded_id
			});
		}

		const body = Buffer.from(await response.arrayBuffer());

		const category = decoded.startsWith(remote_prefix) ? 'data' : 'pages';
		save(category, response, body, decoded, encoded, referrer, 'linked');

		for (const [dependency_path, result] of await prerender_dependencies.promise) {
			// this seems circuitous, but using new URL allows us to not care
			// whether dependency_path is encoded or not
			const encoded_dependency_path = new URL(dependency_path, 'http://localhost').pathname;
			const decoded_dependency_path = decode_uri(encoded_dependency_path);

			const headers = Object.fromEntries(result.response.headers);

			const prerender = headers['x-sveltekit-prerender'];
			if (prerender) {
				const encoded_route_id = headers['x-sveltekit-routeid'];
				if (encoded_route_id != null) {
					const route_id = decode_uri(encoded_route_id);
					const existing_value = prerender_map.get(route_id);
					if (existing_value !== 'auto') {
						prerender_map.set(route_id, prerender === 'true' ? true : 'auto');
					}
				}
			}

			const body = result.body ?? new Uint8Array(await result.response.arrayBuffer());

			const category = decoded_dependency_path.startsWith(remote_prefix) ? 'data' : 'dependencies';

			save(
				category,
				result.response,
				body,
				decoded_dependency_path,
				encoded_dependency_path,
				decoded,
				'fetched'
			);
		}

		// avoid triggering `filterSerializeResponseHeaders` guard
		const headers = Object.fromEntries(response.headers);

		// if it's a 200 HTML response, crawl it. Skip error responses, as we don't save those
		if (
			response.ok &&
			svelte_config.kit.prerender.crawl &&
			headers['content-type'] === 'text/html'
		) {
			const { ids, hrefs } = crawl(body.toString(), decoded);

			actual_hashlinks.set(decoded, ids);

			/** @param {string} href */
			const removePrerenderOrigin = (href) => {
				if (href.startsWith(svelte_config.kit.prerender.origin)) {
					if (href === svelte_config.kit.prerender.origin) return '/';
					if (href.at(svelte_config.kit.prerender.origin.length) !== '/') return href;
					return href.slice(svelte_config.kit.prerender.origin.length);
				}
				return href;
			};

			for (const href of hrefs.map(removePrerenderOrigin)) {
				if (!is_root_relative(href)) continue;

				const { pathname, search, hash } = new URL(href, 'http://localhost');

				if (search) {
					// TODO warn that query strings have no effect on statically-exported pages
				}

				if (hash) {
					const key = decode_uri(pathname + hash);

					if (!expected_hashlinks.has(key)) {
						expected_hashlinks.set(key, new Set());
					}

					/** @type {Set<string>} */ (expected_hashlinks.get(key)).add(decoded);
				}

				void enqueue(decoded, decode_uri(pathname), pathname);
			}
		}
	}

	/** @type {Set<string>} */
	const prerendered_routes = new Set();

	/**
	 * @param {'pages' | 'dependencies' | 'data'} category
	 * @param {Response} response
	 * @param {string | Uint8Array} body
	 * @param {string} decoded
	 * @param {string} encoded
	 * @param {string | null} referrer
	 * @param {'linked' | 'fetched'} referenceType
	 */
	function save(category, response, body, decoded, encoded, referrer, referenceType) {
		const response_type = Math.floor(response.status / 100);
		const headers = Object.fromEntries(response.headers);

		const type = headers['content-type'];
		const is_html = response_type === REDIRECT || type === 'text/html';

		const file = output_filename(decoded, is_html);
		const dest = `${out}/prerendered/${category}/${file}`;

		if (written.has(file)) return;

		const encoded_route_id = response.headers.get('x-sveltekit-routeid');
		const route_id = encoded_route_id != null ? decode_uri(encoded_route_id) : null;
		if (route_id !== null) prerendered_routes.add(route_id);

		if (response_type === REDIRECT) {
			const location = headers['location'];

			if (location) {
				const resolved = resolve(encoded, location);
				if (is_root_relative(resolved)) {
					void enqueue(decoded, decode_uri(resolved), resolved);
				}

				if (!headers['x-sveltekit-normalize']) {
					mkdirp(dirname(dest));

					log.warn(`${response.status} ${decoded} -> ${location}`);

					writeFileSync(
						dest,
						`<script>location.href=${devalue.uneval(
							location
						)};</script><meta http-equiv="refresh" content="${escape_html(
							`0;url=${location}`,
							true
						)}">`
					);

					written.add(file);

					if (!prerendered.redirects.has(decoded)) {
						prerendered.redirects.set(decoded, {
							status: response.status,
							location: resolved
						});

						prerendered.paths.push(decoded);
					}
				}
			} else {
				log.warn(`location header missing on redirect received from ${decoded}`);
			}

			return;
		}

		if (response.status === 200) {
			if (existsSync(dest) && statSync(dest).isDirectory()) {
				throw new Error(
					`Cannot save ${decoded} as it is already a directory. See https://svelte.dev/docs/kit/page-options#prerender-route-conflicts for more information`
				);
			}

			const dir = dirname(dest);

			if (existsSync(dir) && !statSync(dir).isDirectory()) {
				const parent = decoded.split('/').slice(0, -1).join('/');
				throw new Error(
					`Cannot save ${decoded} as ${parent} is already a file. See https://svelte.dev/docs/kit/page-options#prerender-route-conflicts for more information`
				);
			}

			mkdirp(dir);

			log.info(`${response.status} ${decoded}`);
			writeFileSync(dest, body);
			written.add(file);

			if (is_html) {
				prerendered.pages.set(decoded, {
					file
				});
			} else {
				prerendered.assets.set(decoded, {
					type
				});
			}

			prerendered.paths.push(decoded);
		} else if (response_type !== OK) {
			handle_http_error({ status: response.status, path: decoded, referrer, referenceType });
		}

		vite.environments.ssr.hot.send('sveltekit:prerender-assets-update', file);
		saved.set(file, dest);
	}

	/** @type {Array<{ id: string, entries: Array<string>}>} */
	const route_level_entries = [];
	for (const [id, { entries }] of metadata.routes.entries()) {
		if (entries) {
			route_level_entries.push({ id, entries });
		}
	}

	const should_prerender =
		prerender_map.values().some((value) => !!value) || !!metadata.remotes_with_prerender.size;

	if (!should_prerender) {
		return { prerendered, prerender_map };
	}

	log.info('Prerendering');

	const prerender_read_pathname = create_app_dir_matcher(
		svelte_config.kit.paths.base,
		svelte_config.kit.appDir,
		'/prerender-read'
	);

	/** @type {PluginOption} */
	const plugin_prerender = {
		name: 'vite-plugin-sveltekit-compile:prerender',
		configureServer(vite) {
			return () => {
				vite.middlewares.use((req, res, next) => {
					req.url = req.url?.replace(
						new RegExp(escape_for_regexp(`^http://localhost:${port}`)),
						svelte_config.kit.prerender.origin
					);
					req.headers.host = new URL(svelte_config.kit.prerender.origin).host;

					const base = `${vite.config.server.https ? 'https' : 'http'}://${
						req.headers[':authority'] || req.headers.host
					}`;

					const url = new URL(base + req.url);
					const decoded = decodeURI(url.pathname);

					if (decoded.match(prerender_read_pathname)) {
						const file = url.searchParams.get('file');

						if (!file) {
							res.writeHead(400);
							res.end('Missing file query argument');
							return;
						}

						/** @type {Buffer<ArrayBuffer>} */
						let data;

						// stuff we just wrote
						const filepath = saved.get(file);
						if (filepath) {
							data = readFileSync(filepath);
						} else if (file.startsWith(svelte_config.kit.appDir)) {
							// Static assets emitted during build
							data = readFileSync(`${out}/server/${file}`);
						} else {
							// stuff in `static`
							data = readFileSync(join(svelte_config.kit.files.assets, file));
						}

						res.setHeader('content-type', 'application/octet-stream');
						res.end(data);
						return;
					}

					next();
				});
			};
		}
	};

	const vite = await create_build_server({
		svelte_config,
		out,
		manifest_path,
		server_path: prerender_entry,
		vite_plugins: [plugin_prerender]
	});

	// only start the app server after checking if prerendering is needed so
	// that we don't run the user's `init` hook unnecessarily
	if (!vite.httpServer?.listening) {
		await vite.listen();
	}

	const address = vite.httpServer?.address();
	const port = typeof address === 'string' ? Number(address.split(':').at(-1)) : address?.port;

	for (const entry of svelte_config.kit.prerender.entries) {
		if (entry === '*') {
			for (const [id, prerender] of prerender_map) {
				if (prerender) {
					// remove optional parameters from the route
					const segments = get_route_segments(id).filter((segment) => !segment.startsWith('[['));
					const processed_id = '/' + segments.join('/');

					if (processed_id.includes('[')) continue;
					const path = `/${get_route_segments(processed_id).join('/')}`;
					void enqueue(null, svelte_config.kit.paths.base + path);
				}
			}
		} else {
			void enqueue(null, svelte_config.kit.paths.base + entry);
		}
	}

	for (const { id, entries } of route_level_entries) {
		for (const entry of entries) {
			void enqueue(null, svelte_config.kit.paths.base + entry, undefined, id);
		}
	}

	const url = new URL(
		`${svelte_config.kit.paths.base}/${svelte_config.kit.appDir}/prerender-functions`,
		`http://localhost:${port}`
	);
	for (const name of metadata.remotes_with_prerender) {
		url.searchParams.append('name', name);
	}

	const response = await fetch(url);
	/** @type {string[]} */
	const functions_to_prerender = await response.json();

	for (const decoded of functions_to_prerender) {
		void enqueue(null, decoded);
	}

	await q.done();

	await vite.close();

	// handle invalid fragment links
	for (const [key, referrers] of expected_hashlinks) {
		const index = key.indexOf('#');
		const path = key.slice(0, index);
		const id = key.slice(index + 1);

		const hashlinks = actual_hashlinks.get(path);
		// ignore fragment links to pages that were not prerendered
		if (!hashlinks) continue;

		if (!hashlinks.includes(id) && !SPECIAL_HASHLINKS.has(id)) {
			handle_missing_id({ id, path, referrers: Array.from(referrers) });
		}
	}

	/** @type {string[]} */
	const not_prerendered = [];

	for (const [route_id, prerender] of prerender_map) {
		if (prerender === true && !prerendered_routes.has(route_id)) {
			not_prerendered.push(route_id);
		}
	}

	if (not_prerendered.length > 0) {
		handle_not_prerendered_route({ routes: not_prerendered });
	}

	return { prerendered, prerender_map };
}
