import { readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve as resolve_path } from 'path';
import { pathToFileURL, URL } from 'url';
import { mkdirp } from '../../utils/filesystem.js';
import { __fetch_polyfill } from '../../install-fetch.js';
import { SVELTE_KIT } from '../constants.js';
import { get_single_valued_header } from '../../utils/http.js';
import { is_root_relative, resolve } from '../../utils/url.js';
import { queue } from './queue.js';

/**
 * @typedef {import('types/config').PrerenderErrorHandler} PrerenderErrorHandler
 * @typedef {import('types/config').PrerenderOnErrorValue} OnError
 * @typedef {import('types/internal').Logger} Logger
 */

/** @param {string} html */
function clean_html(html) {
	return html
		.replace(/<!\[CDATA\[[\s\S]*?\]\]>/gm, '')
		.replace(/(<script[\s\S]*?>)[\s\S]*?<\/script>/gm, '$1</' + 'script>')
		.replace(/(<style[\s\S]*?>)[\s\S]*?<\/style>/gm, '$1</' + 'style>')
		.replace(/<!--[\s\S]*?-->/gm, '');
}

/** @param {string} attrs */
export function get_href(attrs) {
	const match = /(?:[\s'"]|^)href\s*=\s*(?:"(.*?)"|'(.*?)'|([^\s>]*))/.exec(attrs);
	return match && (match[1] || match[2] || match[3]);
}

/** @param {string} attrs */
function get_src(attrs) {
	const match = /(?:[\s'"]|^)src\s*=\s*(?:"(.*?)"|'(.*?)'|([^\s>]*))/.exec(attrs);
	return match && (match[1] || match[2] || match[3]);
}

/** @param {string} attrs */
export function is_rel_external(attrs) {
	const match = /rel\s*=\s*(?:["'][^>]*(external)[^>]*["']|(external))/.exec(attrs);
	return !!match;
}

/** @param {string} attrs */
function get_srcset_urls(attrs) {
	const results = [];
	// Note that the srcset allows any ASCII whitespace, including newlines.
	const match = /([\s'"]|^)srcset\s*=\s*(?:"(.*?)"|'(.*?)'|([^\s>]*))/s.exec(attrs);
	if (match) {
		const attr_content = match[1] || match[2] || match[3];
		// Parse the content of the srcset attribute.
		// The regexp is modelled after the srcset specs (https://html.spec.whatwg.org/multipage/images.html#srcset-attribute)
		// and should cover most reasonable cases.
		const regex = /\s*([^\s,]\S+[^\s,])\s*((?:\d+w)|(?:-?\d+(?:\.\d+)?(?:[eE]-?\d+)?x))?/gm;
		let sub_matches;
		while ((sub_matches = regex.exec(attr_content))) {
			results.push(sub_matches[1]);
		}
	}
	return results;
}

/** @type {(errorDetails: Parameters<PrerenderErrorHandler>[0] ) => string} */
function errorDetailsToString({ status, path, referrer, referenceType }) {
	return `${status} ${path}${referrer ? ` (${referenceType} from ${referrer})` : ''}`;
}

/** @type {(log: Logger, onError: OnError) => PrerenderErrorHandler} */
function chooseErrorHandler(log, onError) {
	switch (onError) {
		case 'continue':
			return (errorDetails) => {
				log.error(errorDetailsToString(errorDetails));
			};
		case 'fail':
			return (errorDetails) => {
				throw new Error(errorDetailsToString(errorDetails));
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

	const error = chooseErrorHandler(log, config.kit.prerender.onError);

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
		/** @type {Map<string, import('types/hooks').ServerResponse>} */
		const dependencies = new Map();

		const rendered = await app.render(
			{
				method: 'GET',
				headers: {},
				path,
				rawBody: null,
				query: new URLSearchParams()
			},
			{
				prerender: {
					all,
					dependencies
				}
			}
		);

		if (rendered) {
			const response_type = Math.floor(rendered.status / 100);
			const headers = rendered.headers;
			const type = headers && headers['content-type'];
			const is_html = response_type === REDIRECT || type === 'text/html';

			const parts = decoded_path.split('/');
			if (is_html && parts[parts.length - 1] !== 'index.html') {
				parts.push('index.html');
			}

			const file = `${out}${parts.join('/')}`;

			if (response_type === REDIRECT) {
				const location = get_single_valued_header(headers, 'location');

				if (location) {
					mkdirp(dirname(file));

					log.warn(`${rendered.status} ${decoded_path} -> ${location}`);
					writeFileSync(file, `<meta http-equiv="refresh" content="0;url=${encodeURI(location)}">`);

					const resolved = resolve(path, location);
					if (is_root_relative(resolved)) {
						enqueue(resolved, path);
					}
				} else {
					log.warn(`location header missing on redirect received from ${decoded_path}`);
				}

				return;
			}

			if (rendered.status === 200) {
				mkdirp(dirname(file));

				log.info(`${rendered.status} ${decoded_path}`);
				writeFileSync(file, rendered.body || '');
				paths.push(normalize(decoded_path));
			} else if (response_type !== OK) {
				error({ status: rendered.status, path, referrer, referenceType: 'linked' });
			}

			dependencies.forEach((result, dependency_path) => {
				const response_type = Math.floor(result.status / 100);

				const is_html = result.headers['content-type'] === 'text/html';

				const parts = dependency_path.split('/');
				if (is_html && parts[parts.length - 1] !== 'index.html') {
					parts.push('index.html');
				}

				const file = `${out}${parts.join('/')}`;
				mkdirp(dirname(file));

				if (result.body) {
					writeFileSync(file, result.body);
					paths.push(dependency_path);
				}

				if (response_type === OK) {
					log.info(`${result.status} ${dependency_path}`);
				} else {
					error({
						status: result.status,
						path: dependency_path,
						referrer: path,
						referenceType: 'fetched'
					});
				}
			});

			if (is_html && config.kit.prerender.crawl) {
				const cleaned = clean_html(/** @type {string} */ (rendered.body));

				let match;
				const pattern = /<(a|img|link|source)\s+([\s\S]+?)>/gm;

				const hrefs = [];

				while ((match = pattern.exec(cleaned))) {
					const element = match[1];
					const attrs = match[2];

					if (element === 'a' || element === 'link') {
						if (is_rel_external(attrs)) continue;

						hrefs.push(get_href(attrs));
					} else {
						if (element === 'img') {
							hrefs.push(get_src(attrs));
						}
						hrefs.push(...get_srcset_urls(attrs));
					}
				}

				for (const href of hrefs) {
					if (!href) continue;

					const resolved = resolve(path, href);
					if (!is_root_relative(resolved)) continue;

					const parsed = new URL(resolved, 'http://localhost');
					const pathname = decodeURI(parsed.pathname).replace(config.kit.paths.base, '');

					const file = pathname.slice(1);
					if (files.has(file)) continue;

					if (parsed.search) {
						// TODO warn that query strings have no effect on statically-exported pages
					}

					enqueue(pathname, path);
				}
			}
		}
	}

	if (config.kit.prerender.enabled) {
		for (const entry of config.kit.prerender.entries) {
			if (entry === '*') {
				for (const entry of build_data.entries) {
					enqueue(entry, null);
				}
			} else {
				enqueue(entry, null);
			}
		}

		await q.done();
	}

	if (fallback) {
		const rendered = await app.render(
			{
				method: 'GET',
				headers: {},
				path: '[fallback]', // this doesn't matter, but it's easiest if it's a string
				rawBody: null,
				query: new URLSearchParams()
			},
			{
				prerender: {
					fallback,
					all: false,
					dependencies: new Map()
				}
			}
		);

		const file = join(out, fallback);
		mkdirp(dirname(file));
		writeFileSync(file, rendered.body || '');
	}

	return {
		paths
	};
}
