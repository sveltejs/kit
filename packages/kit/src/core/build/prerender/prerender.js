import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { pathToFileURL, URL } from 'url';
import { mkdirp } from '../../../utils/filesystem.js';
import { installFetch } from '../../../install-fetch.js';
import { is_root_relative, normalize_path, resolve } from '../../../utils/url.js';
import { queue } from './queue.js';
import { crawl } from './crawl.js';
import { escape_html_attr } from '../../../utils/escape.js';

/**
 * @typedef {import('types').PrerenderErrorHandler} PrerenderErrorHandler
 * @typedef {import('types').PrerenderOnErrorValue} OnError
 * @typedef {import('types').Logger} Logger
 */

/** @type {(details: Parameters<PrerenderErrorHandler>[0] ) => string} */
function format_error({ status, path, referrer, referenceType }) {
	return `${status} ${path}${referrer ? ` (${referenceType} from ${referrer})` : ''}`;
}

/** @type {(log: Logger, onError: OnError) => PrerenderErrorHandler} */
function normalise_error_handler(log, onError) {
	switch (onError) {
		case 'continue':
			return (details) => {
				log.error(format_error(details));
			};
		case 'fail':
			return (details) => {
				throw new Error(format_error(details));
			};
		default:
			return onError;
	}
}

const OK = 2;
const REDIRECT = 3;

/**
 * @param {{
 *   config: import('types').ValidatedConfig;
 *   entries: string[];
 *   files: Set<string>;
 *   log: Logger;
 * }} opts
 */
export async function prerender({ config, entries, files, log }) {
	/** @type {import('types').Prerendered} */
	const prerendered = {
		pages: new Map(),
		assets: new Map(),
		redirects: new Map(),
		paths: []
	};

	installFetch();

	const server_root = join(config.kit.outDir, 'output');

	/** @type {import('types').ServerModule} */
	const { Server, override } = await import(pathToFileURL(`${server_root}/server/index.js`).href);
	const { manifest } = await import(pathToFileURL(`${server_root}/server/manifest.js`).href);

	override({
		paths: config.kit.paths,
		prerendering: true,
		read: (file) => readFileSync(join(config.kit.files.assets, file))
	});

	const server = new Server(manifest);

	const rendered = await server.respond(new Request('http://sveltekit-prerender/[fallback]'), {
		getClientAddress,
		prerender: {
			fallback: true,
			default: false,
			dependencies: new Map()
		}
	});

	const file = `${config.kit.outDir}/output/prerendered/fallback.html`;
	mkdirp(dirname(file));
	writeFileSync(file, await rendered.text());

	if (!config.kit.prerender.enabled) {
		return prerendered;
	}

	const error = normalise_error_handler(log, config.kit.prerender.onError);

	const q = queue(config.kit.prerender.concurrency);

	/**
	 * @param {string} path
	 * @param {boolean} is_html
	 */
	function output_filename(path, is_html) {
		const file = path.slice(config.kit.paths.base.length + 1);

		if (file === '') {
			return 'index.html';
		}

		if (is_html && !file.endsWith('.html')) {
			return file + (config.kit.trailingSlash === 'always' ? 'index.html' : '.html');
		}

		return file;
	}

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

		const file = decoded.slice(config.kit.paths.base.length + 1);
		if (files.has(file)) return;

		return q.add(() => visit(decoded, encoded || encodeURI(decoded), referrer));
	}

	/**
	 * @param {string} decoded
	 * @param {string} encoded
	 * @param {string?} referrer
	 */
	async function visit(decoded, encoded, referrer) {
		if (!decoded.startsWith(config.kit.paths.base)) {
			error({ status: 404, path: decoded, referrer, referenceType: 'linked' });
			return;
		}

		/** @type {Map<string, import('types').PrerenderDependency>} */
		const dependencies = new Map();

		const response = await server.respond(new Request(`http://sveltekit-prerender${encoded}`), {
			getClientAddress,
			prerender: {
				default: config.kit.prerender.default,
				dependencies
			}
		});

		const text = await response.text();

		save('pages', response, text, decoded, encoded, referrer, 'linked');

		for (const [dependency_path, result] of dependencies) {
			// this seems circuitous, but using new URL allows us to not care
			// whether dependency_path is encoded or not
			const encoded_dependency_path = new URL(dependency_path, 'http://localhost').pathname;
			const decoded_dependency_path = decodeURI(encoded_dependency_path);

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

		if (config.kit.prerender.crawl && response.headers.get('content-type') === 'text/html') {
			for (const href of crawl(text)) {
				if (href.startsWith('data:') || href.startsWith('#')) continue;

				const resolved = resolve(encoded, href);
				if (!is_root_relative(resolved)) continue;

				const parsed = new URL(resolved, 'http://localhost');

				if (parsed.search) {
					// TODO warn that query strings have no effect on statically-exported pages
				}

				const pathname = normalize_path(parsed.pathname, config.kit.trailingSlash);
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
		const type = /** @type {string} */ (response.headers.get('content-type'));
		const is_html = response_type === REDIRECT || type === 'text/html';

		const file = output_filename(decoded, is_html);
		const dest = `${config.kit.outDir}/output/prerendered/${category}/${file}`;

		if (written.has(file)) return;
		written.add(file);

		if (response_type === REDIRECT) {
			const location = response.headers.get('location');

			if (location) {
				mkdirp(dirname(dest));

				log.warn(`${response.status} ${decoded} -> ${location}`);

				writeFileSync(
					dest,
					`<meta http-equiv="refresh" content=${escape_html_attr(`0;url=${location}`)}>`
				);

				let resolved = resolve(encoded, location);
				if (is_root_relative(resolved)) {
					resolved = normalize_path(resolved, config.kit.trailingSlash);
					enqueue(decoded, decodeURI(resolved), resolved);
				}

				if (!prerendered.redirects.has(decoded)) {
					prerendered.redirects.set(decoded, {
						status: response.status,
						location: resolved
					});

					prerendered.paths.push(normalize_path(decoded, 'never'));
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

			if (is_html) {
				prerendered.pages.set(decoded, {
					file
				});
			} else {
				prerendered.assets.set(decoded, {
					type
				});
			}

			prerendered.paths.push(normalize_path(decoded, 'never'));
		} else if (response_type !== OK) {
			error({ status: response.status, path: decoded, referrer, referenceType });
		}
	}

	if (config.kit.prerender.enabled) {
		for (const entry of config.kit.prerender.entries) {
			if (entry === '*') {
				for (const entry of entries) {
					enqueue(null, normalize_path(config.kit.paths.base + entry, config.kit.trailingSlash)); // TODO can we pre-normalize these?
				}
			} else {
				enqueue(null, normalize_path(config.kit.paths.base + entry, config.kit.trailingSlash));
			}
		}

		await q.done();
	}

	return prerendered;
}

/** @return {string} */
function getClientAddress() {
	throw new Error('Cannot read clientAddress during prerendering');
}
