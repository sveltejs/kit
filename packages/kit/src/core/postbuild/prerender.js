import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { installPolyfills } from '../../exports/node/polyfills.js';
import { mkdirp, posixify, walk } from '../../utils/filesystem.js';
import { should_polyfill } from '../../utils/platform.js';
import { is_root_relative, resolve } from '../../utils/url.js';
import { escape_html_attr } from '../../utils/escape.js';
import { logger } from '../utils.js';
import { load_config } from '../config/index.js';
import { get_route_segments } from '../../utils/routing.js';
import { queue } from './queue.js';
import { crawl } from './crawl.js';
import { forked } from '../../utils/fork.js';

export default forked(import.meta.url, prerender);

/**
 * @param {{
 *   out: string;
 *   manifest_path: string;
 *   metadata: import('types').ServerMetadata;
 *   verbose: boolean;
 *   env: Record<string, string>
 * }} opts
 */
async function prerender({ out, manifest_path, metadata, verbose, env }) {
	/** @type {import('types').SSRManifest} */
	const manifest = (await import(pathToFileURL(manifest_path).href)).manifest;

	/** @type {import('types').ServerInternalModule} */
	const internal = await import(pathToFileURL(`${out}/server/internal.js`).href);

	/** @type {import('types').ServerModule} */
	const { Server } = await import(pathToFileURL(`${out}/server/index.js`).href);

	// configure `import { building } from '$app/environment'` —
	// essential we do this before analysing the code
	internal.set_building(true);

	/**
	 * @template {{message: string}} T
	 * @template {Omit<T, 'message'>} K
	 * @param {import('types').Logger} log
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
				return () => {};
			default:
				// @ts-expect-error TS thinks T might be of a different kind, but it's not
				return (details) => input({ ...details, message: format(details) });
		}
	}

	const OK = 2;
	const REDIRECT = 3;

	/** @type {import('types').Prerendered} */
	const prerendered = {
		pages: new Map(),
		assets: new Map(),
		redirects: new Map(),
		paths: []
	};

	/** @type {import('types').PrerenderMap} */
	const prerender_map = new Map();

	for (const [id, { prerender }] of metadata.routes) {
		if (prerender !== undefined) {
			prerender_map.set(id, prerender);
		}
	}

	/** @type {Set<string>} */
	const prerendered_routes = new Set();

	/** @type {import('types').ValidatedKitConfig} */
	const config = (await load_config()).kit;

	/** @type {import('types').Logger} */
	const log = logger({ verbose });

	if (should_polyfill) {
		installPolyfills();
	}

	/** @type {Map<string, string>} */
	const saved = new Map();

	const server = new Server(manifest);
	await server.init({ env });

	const handle_http_error = normalise_error_handler(
		log,
		config.prerender.handleHttpError,
		({ status, path, referrer, referenceType }) => {
			const message =
				status === 404 && !path.startsWith(config.paths.base)
					? `${path} does not begin with \`base\`, which is configured in \`paths.base\` and can be imported from \`$app/paths\` - see https://kit.svelte.dev/docs/configuration#paths for more info`
					: path;

			return `${status} ${message}${referrer ? ` (${referenceType} from ${referrer})` : ''}`;
		}
	);

	const handle_missing_id = normalise_error_handler(
		log,
		config.prerender.handleMissingId,
		({ path, id, referrers }) => {
			return (
				`The following pages contain links to ${path}#${id}, but no element with id="${id}" exists on ${path} - see the \`handleMissingId\` option in https://kit.svelte.dev/docs/configuration#prerender for more info:` +
				referrers.map((l) => `\n  - ${l}`).join('')
			);
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

	const files = new Set(walk(`${out}/client`).map(posixify));
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
	 */
	function enqueue(referrer, decoded, encoded) {
		if (seen.has(decoded)) return;
		seen.add(decoded);

		const file = decoded.slice(config.paths.base.length + 1);
		if (files.has(file)) return;

		return q.add(() => visit(decoded, encoded || encodeURI(decoded), referrer));
	}

	/**
	 * @param {string} decoded
	 * @param {string} encoded
	 * @param {string?} referrer
	 */
	async function visit(decoded, encoded, referrer) {
		if (!decoded.startsWith(config.paths.base)) {
			handle_http_error({ status: 404, path: decoded, referrer, referenceType: 'linked' });
			return;
		}

		/** @type {Map<string, import('types').PrerenderDependency>} */
		const dependencies = new Map();

		const response = await server.respond(new Request(config.prerender.origin + encoded), {
			getClientAddress() {
				throw new Error('Cannot read clientAddress during prerendering');
			},
			prerendering: {
				dependencies
			},
			read: (file) => {
				// stuff we just wrote
				const filepath = saved.get(file);
				if (filepath) return readFileSync(filepath);

				// stuff in `static`
				return readFileSync(join(config.files.assets, file));
			}
		});

		const body = Buffer.from(await response.arrayBuffer());

		save('pages', response, body, decoded, encoded, referrer, 'linked');

		for (const [dependency_path, result] of dependencies) {
			// this seems circuitous, but using new URL allows us to not care
			// whether dependency_path is encoded or not
			const encoded_dependency_path = new URL(dependency_path, 'http://localhost').pathname;
			const decoded_dependency_path = decodeURI(encoded_dependency_path);

			const headers = Object.fromEntries(result.response.headers);

			const prerender = headers['x-sveltekit-prerender'];
			if (prerender) {
				const encoded_route_id = headers['x-sveltekit-routeid'];
				if (encoded_route_id != null) {
					const route_id = decodeURI(encoded_route_id);
					const existing_value = prerender_map.get(route_id);
					if (existing_value !== 'auto') {
						prerender_map.set(route_id, prerender === 'true' ? true : 'auto');
					}
				}
			}

			const body = result.body ?? new Uint8Array(await result.response.arrayBuffer());

			save(
				'dependencies',
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

		if (config.prerender.crawl && headers['content-type'] === 'text/html') {
			const { ids, hrefs } = crawl(body.toString());

			actual_hashlinks.set(decoded, ids);

			for (const href of hrefs) {
				if (href.startsWith('data:')) continue;

				const resolved = resolve(encoded, href);
				if (!is_root_relative(resolved)) continue;

				const { pathname, search, hash } = new URL(resolved, 'http://localhost');

				if (search) {
					// TODO warn that query strings have no effect on statically-exported pages
				}

				if (hash) {
					const key = decodeURI(pathname + hash);

					if (!expected_hashlinks.has(key)) {
						expected_hashlinks.set(key, new Set());
					}

					/** @type {Set<string>} */ (expected_hashlinks.get(key)).add(decoded);
				}

				enqueue(decoded, decodeURI(pathname), pathname);
			}
		}
	}

	/**
	 * @param {'pages' | 'dependencies'} category
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
		const dest = `${config.outDir}/output/prerendered/${category}/${file}`;

		if (written.has(file)) return;

		const encoded_route_id = response.headers.get('x-sveltekit-routeid');
		const route_id = encoded_route_id != null ? decodeURI(encoded_route_id) : null;
		if (route_id !== null) prerendered_routes.add(route_id);

		if (response_type === REDIRECT) {
			const location = headers['location'];

			if (location) {
				const resolved = resolve(encoded, location);
				if (is_root_relative(resolved)) {
					enqueue(decoded, decodeURI(resolved), resolved);
				}

				if (!headers['x-sveltekit-normalize']) {
					mkdirp(dirname(dest));

					log.warn(`${response.status} ${decoded} -> ${location}`);

					writeFileSync(
						dest,
						`<meta http-equiv="refresh" content=${escape_html_attr(`0;url=${location}`)}>`
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
			mkdirp(dirname(dest));

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

		manifest.assets.add(file);
		saved.set(file, dest);
	}

	if (
		config.prerender.entries.length > 1 ||
		config.prerender.entries[0] !== '*' ||
		prerender_map.size > 0
	) {
		// Only log if we're actually going to do something to not confuse users
		log.info('Prerendering');
	}

	for (const entry of config.prerender.entries) {
		if (entry === '*') {
			for (const [id, prerender] of prerender_map) {
				if (prerender) {
					if (id.includes('[')) continue;
					const path = `/${get_route_segments(id).join('/')}`;
					enqueue(null, config.paths.base + path);
				}
			}
		} else {
			enqueue(null, config.paths.base + entry);
		}
	}

	await q.done();

	// handle invalid fragment links
	for (const [key, referrers] of expected_hashlinks) {
		const index = key.indexOf('#');
		const path = key.slice(0, index);
		const id = key.slice(index + 1);

		const hashlinks = actual_hashlinks.get(path);
		// ignore fragment links to pages that were not prerendered
		if (!hashlinks) continue;

		if (!hashlinks.includes(id)) {
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
		throw new Error(
			`The following routes were marked as prerenderable, but were not prerendered because they were not found while crawling your app:\n${not_prerendered.map(
				(id) => `  - ${id}`
			)}\n\nSee https://kit.svelte.dev/docs/page-options#prerender-troubleshooting for info on how to solve this`
		);
	}

	return { prerendered, prerender_map };
}
