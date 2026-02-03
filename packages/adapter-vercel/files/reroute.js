import { reroute } from '__HOOKS__';

new TextEncoder();
new TextDecoder();

/** @import { Transport } from '@sveltejs/kit' */

/**
 * If an adapter enables running reroute early in its own server, the original
 * pathname is stored in this query parameter
 */
const ORIGINAL_PATH_PARAM = 'x-sveltekit-original-path';

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

/** @import { StandardSchemaV1 } from '@standard-schema/spec' */


/**
 * Strips possible SvelteKit-internal suffixes and trailing slashes from the URL pathname.
 * Returns the normalized URL as well as a method for adding the potential suffix back
 * based on a new pathname (possibly including search) or URL.
 * ```js
 * import { normalizeUrl } from '@sveltejs/kit';
 *
 * const { url, denormalize } = normalizeUrl('/blog/post/__data.json');
 * console.log(url.pathname); // /blog/post
 * console.log(denormalize('/blog/post/a')); // /blog/post/a/__data.json
 * ```
 * @param {URL | string} url
 * @returns {{ url: URL, wasNormalized: boolean, denormalize: (url?: string | URL) => URL }}
 * @since 2.18.0
 */
function normalizeUrl(url) {
	url = new URL(url, 'http://internal');

	const is_route_resolution = has_resolution_suffix(url.pathname);
	const is_data_request = has_data_suffix(url.pathname);
	const has_trailing_slash = url.pathname !== '/' && url.pathname.endsWith('/');

	if (is_route_resolution) {
		url.pathname = strip_resolution_suffix(url.pathname);
	} else if (is_data_request) {
		url.pathname = strip_data_suffix(url.pathname);
	} else if (has_trailing_slash) {
		url.pathname = url.pathname.slice(0, -1);
	}

	return {
		url,
		wasNormalized: is_data_request || is_route_resolution || has_trailing_slash,
		denormalize: (new_url = url) => {
			new_url = new URL(new_url, url);
			if (is_route_resolution) {
				new_url.pathname = add_resolution_suffix(new_url.pathname);
			} else if (is_data_request) {
				new_url.pathname = add_data_suffix(new_url.pathname);
			} else if (has_trailing_slash && !new_url.pathname.endsWith('/')) {
				new_url.pathname += '/';
			}
			return new_url;
		}
	};
}

/**
 * If your deployment platform supports splitting your app into multiple functions,
 * you should run this in a middleware that runs before the main handler
 * to reroute the request to the correct function and [generate a server-side manifest](https://svelte.dev/docs/kit/@sveltejs-kit#Builder)
 * with the `rerouteMiddleware` option set to `true`.
 * @example
 * ```js
 * import { applyReroute } from '@sveltejs/kit/adapter';
 * // replace __HOOKS__ with the path to the reroute hook obtained from `builder.getReroutePath()`
 * import { reroute } from '__HOOKS__';
 *
 * export default function middleware(request) {
 *   return applyReroute(request.url, reroute);
 * }
 * ```
 * @param {string} url
 * @param {import("@sveltejs/kit").Reroute} reroute
 * @returns {Promise<URL>}
 * @since 2.51.0
 */
async function applyReroute(url, reroute) {
	const url_copy = new URL(url);
	url_copy.searchParams.set(ORIGINAL_PATH_PARAM, url_copy.pathname);

	const { url: normalized_url, denormalize } = normalizeUrl(url);
	const resolved_path = await reroute({ url: normalized_url, fetch });

	// bail out if there were no changes to the pathname
	if (!resolved_path || resolved_path === url_copy.pathname) {
		// we always return a URL with the x-sveltekit-original-path param set
		// so that the requester can't fake it
		return url_copy;
	}

	url_copy.pathname = resolved_path;
	return denormalize(url_copy);
}

var middleware$1;
var hasRequiredMiddleware;

function requireMiddleware () {
	if (hasRequiredMiddleware) return middleware$1;
	hasRequiredMiddleware = 1;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
	  for (var name in all)
	    __defProp(target, name, { get: all[name], enumerable: true });
	};
	var __copyProps = (to, from, except, desc) => {
	  if (from && typeof from === "object" || typeof from === "function") {
	    for (let key of __getOwnPropNames(from))
	      if (!__hasOwnProp.call(to, key) && key !== except)
	        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
	  }
	  return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var middleware_exports = {};
	__export(middleware_exports, {
	  next: () => next,
	  rewrite: () => rewrite
	});
	middleware$1 = __toCommonJS(middleware_exports);
	function handleMiddlewareField(init, headers) {
	  if (init?.request?.headers) {
	    if (!(init.request.headers instanceof Headers)) {
	      throw new Error("request.headers must be an instance of Headers");
	    }
	    const keys = [];
	    for (const [key, value] of init.request.headers) {
	      headers.set("x-middleware-request-" + key, value);
	      keys.push(key);
	    }
	    headers.set("x-middleware-override-headers", keys.join(","));
	  }
	}
	function rewrite(destination, init) {
	  const headers = new Headers(init?.headers ?? {});
	  headers.set("x-middleware-rewrite", String(destination));
	  handleMiddlewareField(init, headers);
	  return new Response(null, {
	    ...init,
	    headers
	  });
	}
	function next(init) {
	  const headers = new Headers(init?.headers ?? {});
	  headers.set("x-middleware-next", "1");
	  handleMiddlewareField(init, headers);
	  return new Response(null, {
	    ...init,
	    headers
	  });
	}
	return middleware$1;
}

var middlewareExports = requireMiddleware();

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function middleware(request) {
	const resolved_url = await applyReroute(request.url, reroute);
	return middlewareExports.rewrite(resolved_url);
}

export { middleware as default };
