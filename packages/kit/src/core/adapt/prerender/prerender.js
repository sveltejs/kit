import { readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve as resolve_path } from 'path';
import { pathToFileURL, URL } from 'url';
import { mkdirp } from '../../../utils/filesystem.js';
import { __fetch_polyfill } from '../../../install-fetch.js';
import { SVELTE_KIT } from '../../constants.js';
import { is_root_relative, resolve } from '../../../utils/url.js';
import { queue } from './queue.js';
import { crawl } from './crawl.js';
import { escape_html_attr } from '../../../utils/escape.js';

/**
 * @typedef {import('types/config').PrerenderErrorHandler} PrerenderErrorHandler
 * @typedef {import('types/config').PrerenderOnErrorValue} OnError
 * @typedef {import('types/internal').Logger} Logger
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
 *   cwd: string;
 *   out: string;
 *   log: Logger;
 *   config: import('types/config').ValidatedConfig;
 *   build_data: import('types/internal').BuildData;
 *   fallback?: string;
 *   all: boolean; // disregard `export const prerender = true`
 * }} opts
 * @returns {Promise<{ paths: string[] }>} returns a promise that resolves to an array of paths corresponding to the files that have been prerendered.
 */
export async function prerender({ cwd, out, log, config, build_data, fallback, all }) {
	if (!config.kit.prerender.enabled && !fallback) {
		return { paths: [] };
	}

	__fetch_polyfill();

	mkdirp(out);

	const dir = resolve_path(cwd, `${SVELTE_KIT}/output`);

	const seen = new Set();

	const server_root = resolve_path(dir);

	/** @type {import('types/internal').AppModule} */
	const { App, override } = await import(pathToFileURL(`${server_root}/server/app.js`).href);

	override({
		paths: config.kit.paths,
		prerendering: true,
		read: (file) => readFileSync(join(config.kit.files.assets, file))
	});

	const { manifest } = await import(pathToFileURL(`${server_root}/server/manifest.js`).href);

	const app = new App(manifest);

	const error = normalise_error_handler(log, config.kit.prerender.onError);

	const files = new Set([
		...build_data.static,
		...build_data.client.chunks.map((chunk) => `${config.kit.appDir}/${chunk.fileName}`),
		...build_data.client.assets.map((chunk) => `${config.kit.appDir}/${chunk.fileName}`)
	]);

	/** @type {string[]} */
	const paths = [];

	build_data.static.forEach((file) => {
		if (file.endsWith('/index.html')) {
			files.add(file.slice(0, -11));
		}
	});

	/**
	 * @param {string} path
	 */
	function normalize(path) {
		if (config.kit.trailingSlash === 'always') {
			return path.endsWith('/') ? path : `${path}/`;
		} else if (config.kit.trailingSlash === 'never') {
			return !path.endsWith('/') || path === '/' ? path : path.slice(0, -1);
		}

		return path;
	}

	const q = queue(config.kit.prerender.concurrency);

	/**
	 * @param {string} path
	 * @param {boolean} is_html
	 */
	function output_filename(path, is_html) {
		path = path.slice(config.kit.paths.base.length) || '/';

		if (path === '/') {
			return '/index.html';
		}

		const parts = path.split('/');
		if (is_html && parts[parts.length - 1] !== 'index.html') {
			if (config.kit.trailingSlash === 'always') {
				parts.push('index.html');
			} else {
				parts[parts.length - 1] += '.html';
			}
		}
		return parts.join('/');
	}

	/**
	 * @param {string} decoded_path
	 * @param {string?} referrer
	 */
	function enqueue(decoded_path, referrer) {
		const path = encodeURI(normalize(decoded_path));

		if (seen.has(path)) return;
		seen.add(path);

		return q.add(() => visit(path, decoded_path, referrer));
	}

	/**
	 * @param {string} path
	 * @param {string} decoded_path
	 * @param {string?} referrer
	 */
	async function visit(path, decoded_path, referrer) {
		if (!path.startsWith(config.kit.paths.base)) {
			error({ status: 404, path, referrer, referenceType: 'linked' });
			return;
		}

		/** @type {Map<string, import('types/internal').PrerenderDependency>} */
		const dependencies = new Map();

		const rendered = await app.render(new Request(`http://sveltekit-prerender${path}`), {
			prerender: {
				all,
				dependencies
			}
		});

		const response_type = Math.floor(rendered.status / 100);
		const type = rendered.headers.get('content-type');
		const is_html = response_type === REDIRECT || type === 'text/html';

		const file = `${out}${output_filename(decoded_path, is_html)}`;

		if (response_type === REDIRECT) {
			const location = rendered.headers.get('location');

			if (location) {
				mkdirp(dirname(file));

				log.warn(`${rendered.status} ${decoded_path} -> ${location}`);

				writeFileSync(
					file,
					`<meta http-equiv="refresh" content=${escape_html_attr(`0;url=${location}`)}>`
				);

				const resolved = resolve(path, location);
				if (is_root_relative(resolved)) {
					enqueue(resolved, path);
				}
			} else {
				log.warn(`location header missing on redirect received from ${decoded_path}`);
			}

			return;
		}

		const text = await rendered.text();

		if (rendered.status === 200) {
			mkdirp(dirname(file));

			log.info(`${rendered.status} ${decoded_path}`);
			writeFileSync(file, text);
			paths.push(normalize(decoded_path));
		} else if (response_type !== OK) {
			error({ status: rendered.status, path, referrer, referenceType: 'linked' });
		}

		for (const [dependency_path, result] of dependencies) {
			const { status, headers } = result.response;

			const response_type = Math.floor(status / 100);

			const is_html = headers.get('content-type') === 'text/html';

			const file = `${out}${output_filename(dependency_path, is_html)}`;
			mkdirp(dirname(file));

			writeFileSync(
				file,
				result.body === null ? new Uint8Array(await result.response.arrayBuffer()) : result.body
			);
			paths.push(dependency_path);

			if (response_type === OK) {
				log.info(`${status} ${dependency_path}`);
			} else {
				error({
					status,
					path: dependency_path,
					referrer: path,
					referenceType: 'fetched'
				});
			}
		}

		if (is_html && config.kit.prerender.crawl) {
			for (const href of crawl(text)) {
				if (href.startsWith('data:') || href.startsWith('#')) continue;

				const resolved = resolve(path, href);
				if (!is_root_relative(resolved)) continue;

				const parsed = new URL(resolved, 'http://localhost');

				let pathname = decodeURI(parsed.pathname);

				if (config.kit.paths.base) {
					if (!pathname.startsWith(config.kit.paths.base)) continue;
					pathname = pathname.slice(config.kit.paths.base.length) || '/';
				}

				const file = pathname.slice(1);
				if (files.has(file)) continue;

				if (parsed.search) {
					// TODO warn that query strings have no effect on statically-exported pages
				}

				enqueue(pathname, path);
			}
		}
	}

	if (config.kit.prerender.enabled) {
		for (const entry of config.kit.prerender.entries) {
			if (entry === '*') {
				for (const entry of build_data.entries) {
					enqueue(config.kit.paths.base + entry, null);
				}
			} else {
				enqueue(config.kit.paths.base + entry, null);
			}
		}

		await q.done();
	}

	if (fallback) {
		const rendered = await app.render(new Request('http://sveltekit-prerender/[fallback]'), {
			prerender: {
				fallback,
				all: false,
				dependencies: new Map()
			}
		});

		const file = join(out, fallback);
		mkdirp(dirname(file));
		writeFileSync(file, await rendered.text());
	}

	return {
		paths
	};
}
