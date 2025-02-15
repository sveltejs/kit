import * as user_middleware from 'MIDDLEWARE';

export const config = user_middleware.config;

/**
 * @param {Request} request
 * @param {any} context
 */
export default async function middleware(request, context) {
	const url = new URL(request.url);

	const is_route_resolution = has_resolution_suffix(url.pathname);
	const is_data_request = has_data_suffix(url.pathname);

	if (is_route_resolution) {
		url.pathname = strip_resolution_suffix(url.pathname);
	} else if (is_data_request) {
		url.pathname = strip_data_suffix(url.pathname);
	}

	if (is_route_resolution || is_data_request) {
		request = new Request(url, request);
	}

	const response = await user_middleware.default(request, context);

	if (response instanceof Response && response.headers.has('x-middleware-rewrite')) {
		const rewritten = new URL(
			/** @type {string} */ (response.headers.get('x-middleware-rewrite')),
			url
		);

		if (rewritten.hostname === url.hostname) {
			if (is_route_resolution) {
				rewritten.pathname = add_resolution_suffix(rewritten.pathname);
			} else if (is_data_request) {
				rewritten.pathname = add_data_suffix(rewritten.pathname);
			}

			response.headers.set('REWRITE_HEADER', rewritten.pathname);
		}
	}

	return response;
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
