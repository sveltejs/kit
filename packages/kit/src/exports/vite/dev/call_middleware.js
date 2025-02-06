import { add_cookies_to_headers, get_cookies } from '../../../runtime/server/cookie.js';
import {
	add_resolution_prefix,
	has_resolution_prefix,
	strip_resolution_prefix
} from '../../../runtime/pathname.js';

/**
 * @param {Request} request
 * @param {(options: any) => any} middleware
 */
export async function call_middleware(request, middleware) {
	const { cookies, new_cookies } = get_cookies(request, new URL(request.url), 'never');

	let request_headers_called = false;
	let request_headers = new Headers(request.headers);
	/** @param {Record<string, string>} headers */
	const setRequestHeaders = (headers) => {
		for (const key in headers) {
			const lower = key.toLowerCase();
			const value = headers[key];

			if (lower === 'set-cookie') {
				throw new Error('Cannot set cookies on the request header');
			} else {
				request_headers_called = true;
				request_headers.set(key, value);
			}
		}
	};

	let response_headers = new Headers();
	/** @param {Record<string, string>} headers */
	const setResponseHeaders = (headers) => {
		for (const key in headers) {
			const lower = key.toLowerCase();
			const value = headers[key];

			if (lower === 'set-cookie') {
				throw new Error(
					'Use `cookies.set(name, value, options)` instead of `setResponseHeaders` to set cookies'
				);
			} else {
				response_headers.set(key, value);
			}
		}
	};

	/** @param {string} pathname */
	const reroute = (pathname) => {
		return pathname; // TODO think about making this a class object
	};

	const url = new URL(request.url);
	const is_route_resolution_request = has_resolution_prefix(url.pathname);

	const result = await middleware({
		request: is_route_resolution_request
			? new Request(new URL(strip_resolution_prefix(url.pathname), url), {
					headers: request_headers
				})
			: request,
		setRequestHeaders,
		setResponseHeaders,
		cookies,
		reroute
	});

	if (result instanceof Response) {
		return add_response_headers(result, response_headers, new_cookies);
	}

	if (typeof result === 'string' || request_headers_called) {
		const url = new URL(
			result ? (is_route_resolution_request ? add_resolution_prefix(result) : result) : request.url,
			request.url
		);
		request = new Request(url, { headers: request_headers });
	}

	return {
		request,
		/** @param {Response} response */
		add_response_headers: (response) =>
			add_response_headers(response, response_headers, new_cookies)
	};
}

/**
 * @param {Response} response
 * @param {Headers} headers
 * @param {Record<string, import('../../../runtime/server/page/types.js').Cookie>} new_cookies
 */
function add_response_headers(response, headers, new_cookies) {
	for (const [key, value] of headers) {
		response.headers.set(key, value);
	}

	add_cookies_to_headers(response.headers, Object.values(new_cookies));

	return response;
}
