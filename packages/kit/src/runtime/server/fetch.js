import * as set_cookie_parser from 'set-cookie-parser';
import { respond } from './index.js';

/**
 * @param {{
 *   event: import('types').RequestEvent;
 *   options: import('types').SSROptions;
 *   state: import('types').SSRState;
 *   get_cookie_header: (url: URL, header: string | null) => string;
 * }} opts
 * @returns {typeof fetch}
 */
export function create_fetch({ event, options, state, get_cookie_header }) {
	return async (info, init) => {
		const request = normalize_fetch_input(info, init, event.url);

		const request_body = init?.body;

		return await options.hooks.handleFetch({
			event,
			request,
			fetch: async (info, init) => {
				const request = normalize_fetch_input(info, init, event.url);

				const url = new URL(request.url);

				if (!request.headers.has('origin')) {
					request.headers.set('origin', event.url.origin);
				}

				// Remove Origin, according to https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin#description
				if (
					(request.method === 'GET' || request.method === 'HEAD') &&
					((request.mode === 'no-cors' && url.origin !== event.url.origin) ||
						url.origin === event.url.origin)
				) {
					request.headers.delete('origin');
				}

				if (url.origin !== event.url.origin) {
					// allow cookie passthrough for "same-origin"
					// if SvelteKit is serving my.domain.com:
					// -        domain.com WILL NOT receive cookies
					// -     my.domain.com WILL receive cookies
					// -    api.domain.dom WILL NOT receive cookies
					// - sub.my.domain.com WILL receive cookies
					// ports do not affect the resolution
					// leading dot prevents mydomain.com matching domain.com
					if (
						`.${url.hostname}`.endsWith(`.${event.url.hostname}`) &&
						request.credentials !== 'omit'
					) {
						const cookie = get_cookie_header(url, request.headers.get('cookie'));
						if (cookie) request.headers.set('cookie', cookie);
					}

					let response = await fetch(request);

					if (request.mode === 'no-cors') {
						response = new Response('', {
							status: response.status,
							statusText: response.statusText,
							headers: response.headers
						});
					} else {
						if (url.origin !== event.url.origin) {
							const acao = response.headers.get('access-control-allow-origin');
							if (!acao || (acao !== event.url.origin && acao !== '*')) {
								throw new Error(
									`CORS error: ${
										acao ? 'Incorrect' : 'No'
									} 'Access-Control-Allow-Origin' header is present on the requested resource`
								);
							}
						}
					}

					return response;
				}

				/** @type {Response} */
				let response;

				// handle fetch requests for static assets. e.g. prebaked data, etc.
				// we need to support everything the browser's fetch supports
				const prefix = options.paths.assets || options.paths.base;
				const decoded = decodeURIComponent(url.pathname);
				const filename = (
					decoded.startsWith(prefix) ? decoded.slice(prefix.length) : decoded
				).slice(1);
				const filename_html = `${filename}/index.html`; // path may also match path/index.html

				const is_asset = options.manifest.assets.has(filename);
				const is_asset_html = options.manifest.assets.has(filename_html);

				if (is_asset || is_asset_html) {
					const file = is_asset ? filename : filename_html;

					if (options.read) {
						const type = is_asset
							? options.manifest.mimeTypes[filename.slice(filename.lastIndexOf('.'))]
							: 'text/html';

						return new Response(options.read(file), {
							headers: type ? { 'content-type': type } : {}
						});
					}

					return await fetch(request);
				}

				if (request.credentials !== 'omit') {
					const cookie = get_cookie_header(url, request.headers.get('cookie'));
					if (cookie) {
						request.headers.set('cookie', cookie);
					}

					const authorization = event.request.headers.get('authorization');
					if (authorization && !request.headers.has('authorization')) {
						request.headers.set('authorization', authorization);
					}
				}

				if (request_body && typeof request_body !== 'string' && !ArrayBuffer.isView(request_body)) {
					// TODO is this still necessary? we just bail out below
					// per https://developer.mozilla.org/en-US/docs/Web/API/Request/Request, this can be a
					// Blob, BufferSource, FormData, URLSearchParams, USVString, or ReadableStream object.
					// non-string bodies are irksome to deal with, but luckily aren't particularly useful
					// in this context anyway, so we take the easy route and ban them
					throw new Error('Request body must be a string or TypedArray');
				}

				response = await respond(request, options, state);

				const set_cookie = response.headers.get('set-cookie');
				if (set_cookie) {
					for (const str of set_cookie_parser.splitCookiesString(set_cookie)) {
						const { name, value, ...options } = set_cookie_parser.parseString(str);

						// options.sameSite is string, something more specific is required - type cast is safe
						event.cookies.set(
							name,
							value,
							/** @type {import('cookie').CookieSerializeOptions} */ (options)
						);
					}
				}

				return response;
			}
		});
	};
}

/**
 * @param {RequestInfo | URL} info
 * @param {RequestInit | undefined} init
 * @param {URL} url
 */
function normalize_fetch_input(info, init, url) {
	if (info instanceof Request) {
		return info;
	}

	return new Request(typeof info === 'string' ? new URL(info, url) : info, init);
}
