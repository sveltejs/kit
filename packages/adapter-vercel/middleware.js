import { rewrite, next } from '@vercel/edge';
import { REWRITE_HEADER } from './utils.js';

export { next };

/**
 * @type {typeof import('./middleware.js').normalizeUrl}
 */
export function normalizeUrl(url) {
	let normalized = new URL(url);

	const is_route_resolution = has_resolution_suffix(normalized.pathname);
	const is_data_request = has_data_suffix(normalized.pathname);

	if (is_route_resolution) {
		normalized.pathname = strip_resolution_suffix(normalized.pathname);
	} else if (is_data_request) {
		normalized.pathname = strip_data_suffix(normalized.pathname);
	}

	return {
		url: normalized,
		rewrite: (destination, init) => {
			const rewritten = new URL(destination, url);

			if (rewritten.hostname === normalized.hostname) {
				if (is_route_resolution) {
					rewritten.pathname = add_resolution_suffix(rewritten.pathname);
				} else if (is_data_request) {
					rewritten.pathname = add_data_suffix(rewritten.pathname);
				}

				init ||= {};
				init.headers = new Headers(init.headers);
				init.headers.set(REWRITE_HEADER, rewritten.pathname);
			}

			return rewrite(rewritten, init);
		}
	};
}

// the following internal helpers are a copy-paste of kit/src/runtime/pathname.js - should we expose them publicly?

const DATA_SUFFIX = '/__data.json';
const HTML_DATA_SUFFIX = '.html__data.json';

/** @param {string} pathname */
function has_data_suffix(pathname) {
	return pathname.endsWith(DATA_SUFFIX) || pathname.endsWith(HTML_DATA_SUFFIX);
}

/** @param {string} pathname */
function add_data_suffix(pathname) {
	if (pathname.endsWith('.html')) return pathname.replace(/\.html$/, HTML_DATA_SUFFIX);
	return pathname.replace(/\/$/, '') + DATA_SUFFIX;
}

/** @param {string} pathname */
function strip_data_suffix(pathname) {
	if (pathname.endsWith(HTML_DATA_SUFFIX)) {
		return pathname.slice(0, -HTML_DATA_SUFFIX.length) + '.html';
	}

	return pathname.slice(0, -DATA_SUFFIX.length);
}

const ROUTE_SUFFIX = '/__route.js';

/**
 * @param {string} pathname
 * @returns {boolean}
 */
function has_resolution_suffix(pathname) {
	return pathname.endsWith(ROUTE_SUFFIX);
}

/**
 * Convert a regular URL to a route to send to SvelteKit's server-side route resolution endpoint
 * @param {string} pathname
 * @returns {string}
 */
function add_resolution_suffix(pathname) {
	return pathname.replace(/\/$/, '') + ROUTE_SUFFIX;
}

/**
 * @param {string} pathname
 * @returns {string}
 */
function strip_resolution_suffix(pathname) {
	return pathname.slice(0, -ROUTE_SUFFIX.length);
}
