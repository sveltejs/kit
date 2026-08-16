/** @import { Prerendered, PrerenderMap } from 'types' */
import process from 'node:process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { walk } from '../../utils/filesystem.js';
import { noop } from '../../utils/functions.js';
import { decode_uri, is_root_relative, resolve } from '../../utils/url.js';
import { escape_html } from '../../utils/escape.js';
import { get_runtime_base, logger } from '../utils.js';
import { extract_svelte_config, load_vite_config } from '../config/index.js';
import { get_route_segments } from '../../utils/routing.js';
import { queue } from './queue.js';
import { crawl } from './crawl.js';
import { forked } from '../../utils/fork.js';
import * as devalue from 'devalue';
import { createReadableStream } from '@sveltejs/kit/node';
import generate_fallback from './fallback.js';
import { stringify_remote_arg } from '../../runtime/shared.js';
import { matches_content_type } from '../../utils/http.js';
import { import_peer } from '../../utils/import.js';
import { get_runner } from '../../runner.js';
import { from_fs } from '../../utils/vite.js';
import { format_response } from '../../runtime/server/internal.js';

export default forked(import.meta.url, prerender);

// https://html.spec.whatwg.org/multipage/browsing-the-web.html#scrolling-to-a-fragment
// "If fragment is the empty string, then return the special value top of the document."
// ...and
// "If decodedFragment is an ASCII case-insensitive match for the string 'top', then return the top of the document."
const SPECIAL_HASHLINKS = new Set(['', 'top']);

/**
 * @param {{
 *   hash: boolean;
 *   out: string;
 *   manifest_path: string | null;
 *   metadata: import('types').ServerMetadata;
 *   verbose: boolean;
 *   env: Record<string, string>;
 *   vite_config_file: string;
 *   is_tty: boolean | undefined;
 *   origin: string;
 *   assets: string;
 *   prerendered: Prerendered;
 *   prerender_map: PrerenderMap;
 *   client: string;
 * }} opts
 */
async function prerender({
	hash,
	out,
	manifest_path,
	metadata,
	verbose,
	env,
	vite_config_file,
	is_tty,
	origin,
	assets,
	prerendered,
	prerender_map,
	client
}) {
	const throw_handled = () => {
		throw new Error('__handled__');
	};

	/**
	 * @template {{message: string}} T
	 * @template {Omit<T, 'message'>} K
	 * @param {string} name
	 * @param {'fail' | 'warn' | 'ignore' | undefined | ((details: T) => void)} input
	 * @param {(details: K) => string} format
	 * @returns {(details: K & { error?: unknown }) => void}
	 */
	function normalise_error_handler(name, input, format) {
		/**
		 * @param {any} details
		 */
		function log_failure(details) {
			const message = format(details);
			log.error(`\n${message}\n`);
		}

		switch (input) {
			case 'fail':
				return (details) => {
					log_failure(details);
					throw_handled();
				};
			case 'warn':
				return log_failure;
			case 'ignore':
				return noop;
			case undefined: {
				return (details) => {
					log_failure(details);

					log.err(
						`To suppress or handle this error, implement \`${name}\` in https://svelte.dev/docs/kit/configuration#prerender\n`
					);

					throw_handled();
				};
			}
			default:
				return (details) => {
					const message = format(details);

					try {
						// @ts-expect-error TS thinks T might be of a different kind, but it's not
						input({ ...details, message });
					} catch (error) {
						log.prettyError(error, import.meta.dirname);
						throw_handled();
					}
				};
		}
	}

	const OK = 2;
	const REDIRECT = 3;

	/** @type {Set<string>} */
	const prerendered_routes = new Set();

	const prerender_origin = origin || 'http://sveltekit-prerender';

	if (hash) {
		const fallback = await generate_fallback({
			manifest_path,
			env,
			out,
			origin: prerender_origin,
			assets,
			vite_config_file,
			client
		});

		const file = output_filename('/', true);
		const dest = `${out}/prerendered/pages/${file}`;

		mkdirSync(dirname(dest), { recursive: true });
		writeFileSync(dest, fallback);

		prerendered.pages.set('/', { file });

		return { prerendered, prerender_map };
	}

	const vite = /** @type {typeof import('vite')} */ (await import_peer('vite', process.cwd()));
	const vite_config = await load_vite_config(vite_config_file, vite);

	const config = extract_svelte_config(vite_config);

	const emulator = await config.adapter?.emulate?.();

	/** @type {import('types').Logger} */
	const log = logger({ verbose });

	/** @type {Map<string, string>} */
	const saved = new Map();

	const handle_http_error = normalise_error_handler(
		'handleHttpError',
		config.prerender.handleHttpError,
		({ status, path, referrer, referenceType }) => {
			let message = `Failed to prerender ${path}`;

			if (status === 404) {
				if (!path.startsWith(config.paths.base)) {
					message = referrer ? `${path} (${referenceType} from ${referrer})` : path;

					message += ` does not begin with \`base\`. You can fix this by using \`resolve('${path}')\` from \`$app/paths\`. The base path is configurable from \`paths.base\``;
				} else if (referrer) {
					message = `${path} was ${referenceType} from ${referrer}`;
				}
			}

			return message;
		}
	);

	const handle_missing_id = normalise_error_handler(
		'handleMissingId',
		config.prerender.handleMissingId,
		({ path, id, referrers }) => {
			return (
				`The following pages contain links to ${path}#${id}, but no element with id="${id}" exists on ${path}:` +
				referrers.map((l) => `\n  - ${l}`).join('')
			);
		}
	);

	const handle_entry_generator_mismatch = normalise_error_handler(
		'handleEntryGeneratorMismatch',
		config.prerender.handleEntryGeneratorMismatch,
		({ generatedFromId, entry, matchedId }) => {
			return `The entries export from ${generatedFromId} generated entry ${entry}, which was matched by ${matchedId === entry ? 'a static route' : matchedId}`;
		}
	);

	const handle_not_prerendered_route = normalise_error_handler(
		'handleUnseenRoutes',
		config.prerender.handleUnseenRoutes,
		({ routes }) => {
			const list = routes.map((id) => `  - ${id}`).join('\n');
			return `The following routes were marked as prerenderable, but were not prerendered because they were not found while crawling your app:\n${list}`;
		}
	);

	const handle_invalid_url = normalise_error_handler(
		'handleInvalidUrl',
		config.prerender.handleInvalidUrl,
		({ href, referrer }) => {
			return `Invalid URL ${href}${referrer ? ` (linked from ${referrer})` : ''}`;
		}
	);

	const q = queue(config.prerender.concurrency);

	/**
	 * @param {string} path
	 * @param {boolean} is_html
	 */
	function output_filename(path, is_html) {
		const file = path.slice(config.paths.base.length + 1) || 'index.html';

		if (is_html && !file.endsWith('.html')) {
			return file + (file.endsWith('/') ? 'index.html' : '.html');
		}

		return file;
	}

	const files = new Set(walk(`${out}/client`));
	files.add(`${config.appDir}/env.js`);

	const immutable = `${config.appDir}/immutable`;
	if (existsSync(`${out}/server/${immutable}`)) {
		for (const file of walk(`${out}/server/${immutable}`)) {
			files.add(`${config.appDir}/immutable/${file}`);
		}
	}

	const remote_prefix = `${config.paths.base}/${config.appDir}/remote/`;

	const seen = new Set();
	const written = new Set();

	/** @type {Map<string, Promise<any>>} */
	const remote_responses = new Map();

	/** @type {null | { clear: () => void; update: (path: string) => void; updated: number }} */
	let progress = null;

	if (is_tty) {
		// Where possible, provide progress feedback by showing the path we're
		// currently requesting, then clearing the line once the response comes in.
		// This avoids the wall of text that happens when you prerender
		// many pages and log each response
		const { stdout, stderr } = process;

		let current = false;
		let needs_newline = true;

		const write = stdout.write;

		/** @param {string} value */
		const print = (value) => write.call(stdout, value);

		/** @type {ProxyHandler<typeof stdout.write>} */
		const intercept = {
			apply(target, this_arg, args) {
				const chunk = args[0];
				if (chunk.length > 0) {
					current = false;
					needs_newline =
						typeof chunk === 'string' ? !chunk.endsWith('\n') : chunk[chunk.length - 1] !== 10;
				}
				return Reflect.apply(target, this_arg, args);
			}
		};

		stdout.write = new Proxy(stdout.write, intercept);
		stderr.write = new Proxy(stderr.write, intercept);

		progress = {
			clear: () => {
				// If app code writes to stdout or stderr, don't move the cursor to clear
				// the previous progress log, because that will corrupt things
				if (!current) return;

				print('\x1B[1A'); // move cursor to start of progress update
				print('\x1B[2K'); // clear current line
			},

			update: (path) => {
				// if we're in the middle of a line, start a new one
				if (needs_newline) print('\n');

				print(`crawling ${path}\n`);
				current = true;
				needs_newline = false;
			},

			updated: 0
		};
	}

	/** @type {Set<string>} */
	const resolved_route_ids = new Set();

	/** @type {Map<string, Set<string>>} */
	const expected_hashlinks = new Map();

	/** @type {Map<string, Set<string>>} */
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

		const file = decoded.slice(config.paths.base.length + 1);
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
		if (!decoded.startsWith(config.paths.base)) {
			handle_http_error({ status: 404, path: decoded, referrer, referenceType: 'linked' });
			return;
		}

		/** @type {Map<string, import('types').PrerenderDependency>} */
		const dependencies = new Map();

		if (progress) {
			progress.clear();
			progress.update(decoded);

			if (Date.now() - progress.updated > 50) {
				progress.updated = Date.now();

				// without this, the update will rarely be visible, and progress will appear stuck
				await new Promise((f) => setTimeout(f, 0));
			}
		}

		const request = new Request(prerender_origin + encoded);

		const response = await server.respond(request, {
			getClientAddress() {
				throw new Error('Cannot read clientAddress during prerendering');
			},
			prerendering: {
				dependencies,
				remote_responses,
				resolved_route_ids
			},
			read: (file) => {
				// stuff we just wrote
				const filepath = saved.get(file);
				if (filepath) return readFileSync(filepath);

				// Static assets emitted during build
				if (file.startsWith(config.appDir)) {
					return readFileSync(`${out}/server/${file}`);
				}

				// stuff in `static`
				return readFileSync(join(config.files.assets, file));
			},
			emulator
		});

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

		if (response.status >= 400) {
			console.log(format_response(response.status, request));
		}

		const body = Buffer.from(await response.arrayBuffer());

		const category = decoded.startsWith(remote_prefix) ? 'data' : 'pages';
		save(category, response, body, decoded, encoded, referrer, 'linked');

		for (const [dependency_path, result] of dependencies) {
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
			config.prerender.crawl &&
			matches_content_type(headers['content-type'], 'text/html')
		) {
			const { ids, hrefs, invalid } = crawl(body.toString(), decoded);

			for (const href of invalid) {
				handle_invalid_url({ href, referrer: decoded });
			}

			actual_hashlinks.set(decoded, new Set(ids));

			/** @param {string} href */
			const removePrerenderOrigin = (href) => {
				if (href.startsWith(prerender_origin)) {
					if (href === prerender_origin) return '/';
					if (href.at(prerender_origin.length) !== '/') return href;
					return href.slice(prerender_origin.length);
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
		const is_html = response_type === REDIRECT || matches_content_type(type, 'text/html');

		if (!is_html && response.status === 200 && decoded.slice(config.paths.base.length + 1) === '') {
			throw new Error(
				`Cannot prerender a root +server.js that returns a non-HTML response - static hosts always serve an HTML file for \`${config.paths.base || '/'}\``
			);
		}

		const file = output_filename(decoded, is_html);
		const dest = `${config.outDir}/output/prerendered/${category}/${file}`;

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
					mkdirSync(dirname(dest), { recursive: true });

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

			mkdirSync(dir, { recursive: true });

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
			handle_http_error({
				status: response.status,
				path: decoded,
				referrer,
				referenceType
			});
		}

		manifest.assets.add(file);
		saved.set(file, dest);
	}

	/** @type {Array<{ id: string, entries: Array<string>}>} */
	const route_level_entries = [];
	for (const [id, { entries }] of metadata.routes.entries()) {
		if (entries) {
			route_level_entries.push({ id, entries });
		}
	}

	const { manifest, server, vite_dev_server } = await (manifest_path
		? get_ssr_build_server({
				manifest_path,
				out,
				env
			})
		: get_ssr_vite_server({ vite, vite_config_file, env, client }));

	try {
		/** @type {Array<import('types').RemotePrerenderInternals>} */
		const prerender_functions = [];

		for (const loader of Object.values(manifest.remotes)) {
			const module = await loader();

			for (const fn of Object.values(module.default)) {
				if (fn?.__?.type === 'prerender') {
					prerender_functions.push(fn.__);
				}
			}
		}

		log.info('Prerendering');

		for (const entry of config.prerender.entries) {
			if (entry === '*') {
				for (const [id, prerender] of prerender_map) {
					if (prerender) {
						// remove optional parameters from the route
						const segments = get_route_segments(id).filter((segment) => !segment.startsWith('[['));
						const processed_id = '/' + segments.join('/');

						if (processed_id.includes('[')) continue;
						const path = `/${get_route_segments(processed_id).join('/')}`;
						void enqueue(null, config.paths.base + path);
					}
				}
			} else {
				void enqueue(null, config.paths.base + entry);
			}
		}

		for (const { id, entries } of route_level_entries) {
			for (const entry of entries) {
				void enqueue(null, config.paths.base + entry, undefined, id);
			}
		}

		for (const internals of prerender_functions) {
			if (internals.has_arg) {
				for (const arg of (await internals.inputs?.()) ?? []) {
					void enqueue(null, remote_prefix + internals.id + '/' + stringify_remote_arg(arg));
				}
			} else {
				void enqueue(null, remote_prefix + internals.id);
			}
		}

		await q.done();
		progress?.clear();

		// handle invalid fragment links
		for (const [key, referrers] of expected_hashlinks) {
			const index = key.indexOf('#');
			const path = key.slice(0, index);
			const id = key.slice(index + 1);

			const hashlinks = actual_hashlinks.get(path);
			// ignore fragment links to pages that were not prerendered
			if (!hashlinks) continue;

			if (!hashlinks.has(id) && !SPECIAL_HASHLINKS.has(id)) {
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
	} finally {
		await vite_dev_server?.close();
	}
}

/**
 * @param {object} opts
 * @param {string} opts.manifest_path
 * @param {string} opts.out
 * @param {Record<string, string>} opts.env
 */
async function get_ssr_build_server({ manifest_path, out, env }) {
	/** @type {import('types').SSRManifest} */
	const manifest = (await import(pathToFileURL(manifest_path).href)).manifest;

	/** @type {import('types').ServerInternalModule} */
	const { set_building, set_prerendering } = await import(
		pathToFileURL(`${out}/server/internal.js`).href
	);

	// configure `import { building } from `$app/env` —
	// essential we do this before analysing the code
	set_building();
	set_prerendering();

	/** @type {import('types').ServerModule} */
	const { Server } = await import(pathToFileURL(`${out}/server/index.js`).href);

	const server = new Server(manifest);
	await server.init({
		env,
		read: (file) => createReadableStream(`${out}/server/${file}`)
	});

	return {
		manifest,
		server,
		vite_dev_server: null
	};
}

/**
 * @param {object} opts
 * @param {typeof import('vite')} opts.vite
 * @param {string} opts.vite_config_file
 * @param {Record<string, string>} opts.env
 * @param {string} opts.client
 */
async function get_ssr_vite_server({ vite, vite_config_file, env, client }) {
	const vite_config = await load_vite_config(vite_config_file, vite, 'serve', {
		logLevel: 'silent',
		server: { hmr: false }
	});

	const vite_dev_server = await vite.createServer(vite_config);
	await vite_dev_server.listen();

	try {
		// initialise the server with a request so that the SSR manifest gets built
		if (!vite_dev_server.resolvedUrls?.local[0]) {
			throw new Error('failed to resolve vite dev server url');
		}
		await fetch(new URL('/_app/building', vite_dev_server.resolvedUrls?.local[0]));

		const runtime_base = get_runtime_base(vite_config.root);

		const runner = get_runner(vite, vite_dev_server);
		const env_internal = /** @type {typeof import('../../runtime/app/env/server.js')} */ (
			await runner.import(`${runtime_base}/app/env/server.js`)
		);

		// configure `import { building } from `$app/env` —
		// essential we do this before analysing the code
		env_internal.set_building();
		env_internal.set_prerendering();

		// `set_env` and `Server` live in modules that import the user's `src/env` config. We import them
		// *after* `set_building()` so that `building`-dependent expressions resolve correctly

		/** @type {import('types').ServerModule} */
		const { Server } = await runner.import(`${runtime_base}/server/index.js`);

		/** @type {{ manifest: import('types').SSRManifest }} */
		// @ts-expect-error we've added `__sveltekit` to the Vite dev server object
		const { manifest } = vite_dev_server.__sveltekit;
		manifest.client = devalue.parse(client);

		const server = new Server(manifest);
		await server.init({
			env,
			read: (file) => createReadableStream(from_fs(file))
		});

		return {
			manifest,
			server,
			vite_dev_server
		};
	} catch (error) {
		await vite_dev_server.close();
		throw error;
	}
}
