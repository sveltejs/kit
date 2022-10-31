import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { pathToFileURL, URL } from 'url';
import { mkdirp, posixify, walk } from '../../utils/filesystem.js';
import { installPolyfills } from '../../exports/node/polyfills.js';
import { is_root_relative, resolve } from '../../utils/url.js';
import { queue } from './queue.js';
import { crawl } from './crawl.js';
import { escape_html_attr } from '../../utils/escape.js';
import { logger } from '../utils.js';
import { load_config } from '../config/index.js';
import { get_route_segments } from '../../utils/routing.js';
import { get_option } from '../../runtime/server/utils.js';

/**
 * @typedef {import('types').PrerenderErrorHandler} PrerenderErrorHandler
 * @typedef {import('types').Logger} Logger
 */

const [, , client_out_dir, results_path, verbose, env] = process.argv;

prerender();

/**
 * @param {Parameters<PrerenderErrorHandler>[0]} details
 * @param {import('types').ValidatedKitConfig} config
 */
function format_error({ status, path, referrer, referenceType }, config) {
	const message =
		status === 404 && !path.startsWith(config.paths.base)
			? `${path} does not begin with \`base\`, which is configured in \`paths.base\` and can be imported from \`$app/paths\` - see https://kit.svelte.dev/docs/configuration#paths for more info`
			: path;

	return `${status} ${message}${referrer ? ` (${referenceType} from ${referrer})` : ''}`;
}

/**
 * @param {Logger} log
 * @param {import('types').ValidatedKitConfig} config
 * @returns {PrerenderErrorHandler}
 */
function normalise_error_handler(log, config) {
	switch (config.prerender.onError) {
		case 'continue':
			return (details) => {
				log.error(format_error(details, config));
			};
		case 'fail':
			return (details) => {
				throw new Error(format_error(details, config));
			};
		default:
			return config.prerender.onError;
	}
}

const OK = 2;
const REDIRECT = 3;

/**
 * @param {{
 *   prerendered: import('types').Prerendered;
 *   prerender_map: import('types').PrerenderMap;
 * }} data
 */
const output_and_exit = (data) => {
	writeFileSync(
		results_path,
		JSON.stringify(data, (_key, value) =>
			value instanceof Map ? Array.from(value.entries()) : value
		)
	);
	process.exit(0);
};

export async function prerender() {
	/** @type {import('types').Prerendered} */
	const prerendered = {
		pages: new Map(),
		assets: new Map(),
		redirects: new Map(),
		paths: []
	};

	/** @type {import('types').PrerenderMap} */
	const prerender_map = new Map();

	/** @type {Set<string>} */
	const prerendered_routes = new Set();

	/** @type {import('types').ValidatedKitConfig} */
	const config = (await load_config()).kit;

	if (!config.prerender.enabled) {
		output_and_exit({ prerendered, prerender_map });
		return;
	}

	/** @type {import('types').Logger} */
	const log = logger({
		verbose: verbose === 'true'
	});

	installPolyfills();

	// TODO remove this for 1.0
	const { fetch } = globalThis;
	globalThis.fetch = async (info, init) => {
		const url = info instanceof Request ? info.url : info.toString();

		if (url.startsWith(config.prerender.origin + '/')) {
			const sliced = url.slice(config.prerender.origin.length);
			throw new Error(`Use \`event.fetch('${sliced}')\` instead of the global \`fetch('${url}')\``);
		}

		return fetch(info, init);
	};

	const server_root = join(config.outDir, 'output');

	/** @type {import('types').ServerModule} */
	const { Server, override } = await import(pathToFileURL(`${server_root}/server/index.js`).href);

	/** @type {import('types').SSRManifest} */
	const manifest = (await import(pathToFileURL(`${server_root}/server/manifest.js`).href)).manifest;

	override({
		paths: config.paths,
		prerendering: true,
		read: (file) => readFileSync(join(config.files.assets, file))
	});

	const server = new Server(manifest);
	await server.init({ env: JSON.parse(env) });

	const error = normalise_error_handler(log, config);

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

	const files = new Set(walk(client_out_dir).map(posixify));
	const seen = new Set();
	const written = new Set();

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
			error({ status: 404, path: decoded, referrer, referenceType: 'linked' });
			return;
		}

		/** @type {Map<string, import('types').PrerenderDependency>} */
		const dependencies = new Map();

		const response = await server.respond(new Request(config.prerender.origin + encoded), {
			getClientAddress,
			prerendering: {
				dependencies
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
			for (const href of crawl(body.toString())) {
				if (href.startsWith('data:') || href.startsWith('#')) continue;

				const resolved = resolve(encoded, href);
				if (!is_root_relative(resolved)) continue;

				const { pathname, search } = new URL(resolved, 'http://localhost');

				if (search) {
					// TODO warn that query strings have no effect on statically-exported pages
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
			error({ status: response.status, path: decoded, referrer, referenceType });
		}
	}

	for (const route of manifest._.routes) {
		try {
			if (route.endpoint) {
				const mod = await route.endpoint();
				if (mod.prerender !== undefined) {
					if (mod.prerender && (mod.POST || mod.PATCH || mod.PUT || mod.DELETE)) {
						throw new Error(
							`Cannot prerender a +server file with POST, PATCH, PUT, or DELETE (${route.id})`
						);
					}

					prerender_map.set(route.id, mod.prerender);
				}
			}

			if (route.page) {
				const nodes = await Promise.all(
					[...route.page.layouts, route.page.leaf].map((n) => {
						if (n !== undefined) return manifest._.nodes[n]();
					})
				);
				const prerender = get_option(nodes, 'prerender') ?? false;

				prerender_map.set(route.id, prerender);
			}
		} catch (e) {
			// We failed to import the module, which indicates it can't be prerendered
			// TODO should we catch these? It's almost certainly a bug in the app
			console.error(e);
		}
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

	const rendered = await server.respond(new Request(config.prerender.origin + '/[fallback]'), {
		getClientAddress,
		prerendering: {
			fallback: true,
			dependencies: new Map()
		}
	});

	const file = `${config.outDir}/output/prerendered/fallback.html`;
	mkdirp(dirname(file));
	writeFileSync(file, await rendered.text());

	output_and_exit({ prerendered, prerender_map });
}

/** @return {string} */
function getClientAddress() {
	throw new Error('Cannot read clientAddress during prerendering');
}
