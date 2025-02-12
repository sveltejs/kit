import { add_cookies_to_headers, get_cookies } from './cookie.js';
import { add_resolution_prefix } from '../pathname.js';
import { normalize_url } from './utils.js';

/**
 * @param {Request} request
 * @param {import('@sveltejs/kit').Middleware} middleware
 * @returns {ReturnType<import('@sveltejs/kit').CallMiddleware>}
 */
export async function call_middleware(request, middleware) {
	const { cookies, new_cookies } = get_cookies(request, new URL(request.url), 'never');

	let request_headers_called = false;
	const request_headers = new Headers(request.headers);
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

	const response_headers = new Headers();
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

	const { url, is_route_resolution_request } = normalize_url(new URL(request.url));

	const result = await middleware({
		request,
		url,
		setRequestHeaders,
		setResponseHeaders,
		cookies,
		reroute
	});

	add_cookies_to_headers(response_headers, Object.values(new_cookies));

	const add_response_headers = /** @param {Response} response */ (response) => {
		for (const [key, value] of response_headers) {
			if (key.toLowerCase() === 'set-cookie') {
				response.headers.append('set-cookie', value);
			} else {
				response.headers.set(key, value);
			}
		}
	};

	if (result instanceof Response) {
		return result;
	}

	if (typeof result === 'string' || request_headers_called) {
		const url = new URL(
			typeof result === 'string'
				? is_route_resolution_request
					? add_resolution_prefix(result)
					: result
				: request.url,
			request.url
		);

		request = new Request(url, { headers: request_headers });
	}

	return {
		request,
		request_headers,
		did_reroute: typeof result === 'string',
		response_headers,
		add_response_headers
	};
}
