import { BROWSER } from 'esm-env';

const absolute = /^([a-z]+:)?\/?\//;
const scheme = /^[a-z]+:/;

/**
 * @param {string} base
 * @param {string} path
 */
export function resolve(base, path) {
	if (scheme.test(path)) return path;
	if (path[0] === '#') return base + path;

	const base_match = absolute.exec(base);
	const path_match = absolute.exec(path);

	if (!base_match) {
		throw new Error(`bad base path: "${base}"`);
	}

	const baseparts = path_match ? [] : base.slice(base_match[0].length).split('/');
	const pathparts = path_match ? path.slice(path_match[0].length).split('/') : path.split('/');

	baseparts.pop();

	for (let i = 0; i < pathparts.length; i += 1) {
		const part = pathparts[i];
		if (part === '.') continue;
		else if (part === '..') baseparts.pop();
		else baseparts.push(part);
	}

	const prefix = (path_match && path_match[0]) || (base_match && base_match[0]) || '';

	return `${prefix}${baseparts.join('/')}`;
}

/** @param {string} path */
export function is_root_relative(path) {
	return path[0] === '/' && path[1] !== '/';
}

/**
 * @param {string} path
 * @param {import('types').TrailingSlash} trailing_slash
 */
export function normalize_path(path, trailing_slash) {
	if (path === '/' || trailing_slash === 'ignore') return path;

	if (trailing_slash === 'never') {
		return path.endsWith('/') ? path.slice(0, -1) : path;
	} else if (trailing_slash === 'always' && !path.endsWith('/')) {
		return path + '/';
	}

	return path;
}

/**
 * Decode pathname excluding %25 to prevent further double decoding of params
 * @param {string} pathname
 */
export function decode_pathname(pathname) {
	return pathname.split('%25').map(decodeURI).join('%25');
}

/** @param {Record<string, string>} params */
export function decode_params(params) {
	for (const key in params) {
		// input has already been decoded by decodeURI
		// now handle the rest
		params[key] = decodeURIComponent(params[key]);
	}

	return params;
}

/**
 * The error when a URL is malformed is not very helpful, so we augment it with the URI
 * @param {string} uri
 */
export function decode_uri(uri) {
	try {
		return decodeURI(uri);
	} catch (e) {
		if (e instanceof Error) {
			e.message = `Failed to decode URI: ${uri}\n` + e.message;
		}
		throw e;
	}
}

/**
 * URL properties that could change during the lifetime of the page,
 * which excludes things like `origin`
 * @type {Array<keyof URL>}
 */
const tracked_url_properties = ['href', 'pathname', 'search', 'searchParams', 'toString', 'toJSON'];

/**
 * @param {URL} url
 * @param {() => void} callback
 */
export function make_trackable(url, callback) {
	const tracked = new URL(url);

	for (const property of tracked_url_properties) {
		let value = tracked[property];

		Object.defineProperty(tracked, property, {
			get() {
				callback();
				return value;
			},

			enumerable: true,
			configurable: true
		});
	}

	if (!BROWSER) {
		// @ts-ignore
		tracked[Symbol.for('nodejs.util.inspect.custom')] = (depth, opts, inspect) => {
			return inspect(url, opts);
		};
	}

	disable_hash(tracked);

	return tracked;
}

/**
 * Disallow access to `url.hash` on the server and in `load`
 * @param {URL} url
 */
export function disable_hash(url) {
	Object.defineProperty(url, 'hash', {
		get() {
			throw new Error(
				'Cannot access event.url.hash. Consider using `$page.url.hash` inside a component instead'
			);
		}
	});
}

/**
 * Disallow access to `url.search` and `url.searchParams` during prerendering
 * @param {URL} url
 */
export function disable_search(url) {
	for (const property of ['search', 'searchParams']) {
		Object.defineProperty(url, property, {
			get() {
				throw new Error(`Cannot access url.${property} on a page with prerendering enabled`);
			}
		});
	}
}

const DATA_SUFFIX = '/__data.json';

/** @param {string} pathname */
export function has_data_suffix(pathname) {
	return pathname.endsWith(DATA_SUFFIX);
}

/** @param {string} pathname */
export function add_data_suffix(pathname) {
	return pathname.replace(/\/$/, '') + DATA_SUFFIX;
}

/** @param {string} pathname */
export function strip_data_suffix(pathname) {
	return pathname.slice(0, -DATA_SUFFIX.length);
}
