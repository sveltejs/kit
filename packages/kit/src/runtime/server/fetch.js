import * as set_cookie_parser from 'set-cookie-parser';
import { respond } from './respond.js';
import * as paths from '__sveltekit/paths';

/**
 * @param {{
 *   event: import('types').RequestEvent;
 *   options: import('types').SSROptions;
 *   manifest: import('types').SSRManifest;
 *   state: import('types').SSRState;
 *   get_cookie_header: (url: URL, header: string | null) => string;
 * }} opts
 * @returns {typeof fetch}
 */
export function create_fetch({ event, options, manifest, state, get_cookie_header }) {
	return async (info, init) => {
		const original_request = normalize_fetch_input(info, init, event.url);

		// some runtimes (e.g. Cloudflare) error if you access `request.mode`,
		// annoyingly, so we need to read the value from the `init` object instead
		let mode = (info instanceof Request ? info.mode : init?.mode) ?? 'cors';
		let credentials =
			(info instanceof Request ? info.credentials : init?.credentials) ?? 'same-origin';

		return await options.hooks.handleFetch({
			event,
			request: original_request,
			fetch: async (info, init) => {
				const request = normalize_fetch_input(info, init, event.url);

				const url = new URL(request.url);

				if (!request.headers.has('origin')) {
					request.headers.set('origin', event.url.origin);
				}

				if (info !== original_request) {
					mode = (info instanceof Request ? info.mode : init?.mode) ?? 'cors';
					credentials =
						(info instanceof Request ? info.credentials : init?.credentials) ?? 'same-origin';
				}

				// Remove Origin, according to https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin#description
				if (
					(request.method === 'GET' || request.method === 'HEAD') &&
					((mode === 'no-cors' && url.origin !== event.url.origin) ||
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
					if (`.${url.hostname}`.endsWith(`.${event.url.hostname}`) && credentials !== 'omit') {
						const cookie = get_cookie_header(url, request.headers.get('cookie'));
						if (cookie) request.headers.set('cookie', cookie);
					}

					return fetch(request);
				}

				/** @type {Response} */
				let response;

				// handle fetch requests for static assets. e.g. prebaked data, etc.
				// we need to support everything the browser's fetch supports
				const prefix = paths.assets || paths.base;
				const decoded = decodeURIComponent(url.pathname);
				const filename = (
					decoded.startsWith(prefix) ? decoded.slice(prefix.length) : decoded
				).slice(1);
				const filename_html = `${filename}/index.html`; // path may also match path/index.html

				const is_asset = manifest.assets.has(filename);
				const is_asset_html = manifest.assets.has(filename_html);

				if (is_asset || is_asset_html) {
					const file = is_asset ? filename : filename_html;

					if (state.read) {
						const type = is_asset
							? manifest.mimeTypes[filename.slice(filename.lastIndexOf('.'))]
							: 'text/html';

						return new Response(state.read(file), {
							headers: type ? { 'content-type': type } : {}
						});
					}

					return await fetch(request);
				}

				if (credentials !== 'omit') {
					const cookie = get_cookie_header(url, request.headers.get('cookie'));
					if (cookie) {
						request.headers.set('cookie', cookie);
					}

					const authorization = event.request.headers.get('authorization');
					if (authorization && !request.headers.has('authorization')) {
						request.headers.set('authorization', authorization);
					}
				}

				if (!request.headers.has('accept')) {
					request.headers.set('accept', '*/*');
				}

				if (!request.headers.has('accept-language')) {
					request.headers.set(
						'accept-language',
						/** @type {string} */ (event.request.headers.get('accept-language'))
					);
				}

				response = await respond(request, options, manifest, {
					...state,
					depth: state.depth + 1
				});

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
