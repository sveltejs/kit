import { readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve as resolve_path } from 'path';
import { pathToFileURL, URL } from 'url';
import parse5 from 'parse5';
import { mkdirp } from '../../utils/filesystem.js';
import { __fetch_polyfill } from '../../install-fetch.js';
import { SVELTE_KIT } from '../constants.js';
import { get_single_valued_header } from '../../utils/http.js';
import { is_root_relative, resolve } from '../../utils/url.js';

/**
 * @typedef {import('types/config').PrerenderErrorHandler} PrerenderErrorHandler
 * @typedef {import('types/config').PrerenderOnErrorValue} OnError
 * @typedef {import('types/internal').Logger} Logger
 */

/** @param {string} attrs */
export function get_href(attrs) {
	const match = /(?:[\s'"]|^)href\s*=\s*(?:"(.*?)"|'(.*?)'|([^\s>]*))/.exec(attrs);
	return match && (match[1] || match[2] || match[3]);
}

/** @param {string} attrs */
export function is_rel_external(attrs) {
	const match = /rel\s*=\s*(?:["'][^>]*(external)[^>]*["']|(external))/.exec(attrs);
	return !!match;
}

/**
 * @param {string|Array<string>} contentType
 * @returns {boolean}
 */
export function is_html(contentType) {
	return /text\/html/gi.test(Array.isArray(contentType) ? contentType.join(" ") : contentType);
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
 * @returns {Promise<Array<string>>} returns a promise that resolves to an array of paths corresponding to the files that have been prerendered.
 */
export async function prerender({ cwd, out, log, config, build_data, fallback, all }) {
	if (!config.kit.prerender.enabled && !fallback) {
		return [];
	}

	__fetch_polyfill();

	const dir = resolve_path(cwd, `${SVELTE_KIT}/output`);

	const seen = new Set();

	const server_root = resolve_path(dir);

	/** @type {import('types/internal').App} */
	const app = await import(pathToFileURL(`${server_root}/server/app.js`).href);

	app.init({
		paths: config.kit.paths,
		prerendering: true,
		read: (file) => readFileSync(join(config.kit.files.assets, file))
	});

	const error = chooseErrorHandler(log, config.kit.prerender.onError);

	const files = new Set([...build_data.static, ...build_data.client]);
	const written_files = /** @type {Array<string>} */ ([]);

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

	/**
	 * @param {string} decoded_path
	 * @param {string?} referrer
	 */
	async function visit(decoded_path, referrer) {
		const path = encodeURI(normalize(decoded_path));

		if (seen.has(path)) return;
		seen.add(path);

		/** @type {Map<string, import('types/hooks').ServerResponse>} */
		const dependencies = new Map();

		const rendered = await app.render(
			{
				host: config.kit.host,
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

		if (!rendered) return;

		const response_type = Math.floor(rendered.status / 100);
		const headers = rendered.headers || {};
		const content_type = /** @type {string|Array<string>} */ (headers['content-type']);
		const is_html_content = response_type === REDIRECT || is_html(content_type);

		const parts = decoded_path.split('/');
		if (is_html_content && parts[parts.length - 1] !== 'index.html') {
			parts.push('index.html');
		}

		const file = `${out}${parts.join('/')}`;
		mkdirp(dirname(file));

		if (response_type === REDIRECT) {
			const location = get_single_valued_header(headers, 'location');

			if (location) {
				log.warn(`${rendered.status} ${decoded_path} -> ${location}`);
				writeFileSync(file, `<meta http-equiv="refresh" content="0;url=${encodeURI(location)}">`);
				written_files.push(file);

				const resolved = resolve(path, location);
				if (is_root_relative(resolved)) {
					await visit(resolved, path);
				}
			} else {
				log.warn(`location header missing on redirect received from ${decoded_path}`);
			}

			return;
		}

		if (rendered.status === 200) {
			log.info(`${rendered.status} ${decoded_path}`);
			writeFileSync(file, rendered.body || '');
			written_files.push(file);
		} else if (response_type !== OK) {
			error({ status: rendered.status, path, referrer, referenceType: 'linked' });
		}

		dependencies.forEach((result, dependency_path) => {
			const response_type = Math.floor(result.status / 100);

			const dependency_is_html_content = is_html(result.headers['content-type']);

			const parts = dependency_path.split('/');
			if (dependency_is_html_content && parts[parts.length - 1] !== 'index.html') {
				parts.push('index.html');
			}

			const file = `${out}${parts.join('/')}`;
			mkdirp(dirname(file));

			if (result.body) {
				writeFileSync(file, result.body);
				written_files.push(file);
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

		if (is_html_content && config.kit.prerender.crawl) {
			let nodes = parse5.parseFragment(/** @type {string} */ (rendered.body || '')).childNodes;
			while (nodes.length > 0) {
				const node = /** @type {parse5.Element|undefined} */ (nodes.shift());
				if (!node) break;

				nodes = nodes.concat(node.childNodes || []);

				switch (node.nodeName) {
					// skip if the it's a comment node
					case '#comment':
						continue;
					case '#text':
						continue;
				}

				const attrs = node.attrs || [];
				if (attrs.length === 0) continue;

				while (attrs.length > 0) {
					const attr = /** @type {parse5.Attribute|undefined} */ (attrs.shift());
					if (!attr) break;
					const value = attr.value.trim();

					// ignore the empty attribute value
					if (!value) continue;
					// only interested on src, href and srcset attributes
					if (!/(src|href|srcset)/i.test(attr.name)) continue;

					const resolved = resolve(path, value);
					// skip if it's not a relative path
					if (!is_root_relative(resolved)) continue;

					const parsed = new URL(resolved, 'http://localhost');
					const pathname = decodeURI(parsed.pathname).replace(config.kit.paths.base, '');
					const file = pathname.slice(1);
					// skip if it's exists in static or client folder
					if (files.has(file)) continue;

					if (parsed.search) {
						// TODO warn that query strings have no effect on statically-exported pages
					}

					await visit(pathname, path);
				}
			}
		}
	}

	if (config.kit.prerender.enabled) {
		for (const entry of config.kit.prerender.entries) {
			if (entry === '*') {
				for (const entry of build_data.entries) {
					await visit(entry, null);
				}
			} else {
				await visit(entry, null);
			}
		}
	}

	if (fallback) {
		const rendered = await app.render(
			{
				host: config.kit.host,
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
		written_files.push(file);
	}

	return written_files;
}
