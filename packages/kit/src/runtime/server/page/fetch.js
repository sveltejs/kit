import * as cookie from 'cookie';
import * as set_cookie_parser from 'set-cookie-parser';
import { respond } from '../index.js';
import { domain_matches, path_matches } from '../cookie.js';

/**
 * @param {{
 *   event: import('types').RequestEvent;
 *   options: import('types').SSROptions;
 *   state: import('types').SSRState;
 *   route: import('types').SSRRoute | import('types').SSRErrorPage;
 *   prerender_default?: import('types').PrerenderOption;
 *   resolve_opts: import('types').RequiredResolveOptions;
 * }} opts
 */
export function create_fetch({ event, options, state, route, prerender_default, resolve_opts }) {
	/** @type {import('./types').Fetched[]} */
	const fetched = [];

	const initial_cookies = cookie.parse(event.request.headers.get('cookie') || '');

	/** @type {import('./types').Cookie[]} */
	const set_cookies = [];

	/**
	 * @param {URL} url
	 * @param {string | null} header
	 */
	function get_cookie_header(url, header) {
		/** @type {Record<string, string>} */
		const new_cookies = {};

		for (const cookie of set_cookies) {
			if (!domain_matches(url.hostname, cookie.options.domain)) continue;
			if (!path_matches(url.pathname, cookie.options.path)) continue;

			new_cookies[cookie.name] = cookie.value;
		}

		// cookies from explicit `cookie` header take precedence over cookies previously set
		// during this load with `set-cookie`, which take precedence over the cookies
		// sent by the user agent
		const combined_cookies = {
			...initial_cookies,
			...new_cookies,
			...cookie.parse(header ?? '')
		};

		return Object.entries(combined_cookies)
			.map(([name, value]) => `${name}=${value}`)
			.join('; ');
	}

	/** @type {typeof fetch} */
	const fetcher = async (info, init) => {
		const request = normalize_fetch_input(info, init, event.url);

		const request_body = init?.body;

		/** @type {import('types').PrerenderDependency} */
		let dependency;

		const response = await options.hooks.handleFetch({
			event,
			request,
			fetch: async (info, init) => {
				const request = normalize_fetch_input(info, init, event.url);

				const url = new URL(request.url);

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

				if (request_body && typeof request_body !== 'string') {
					// TODO is this still necessary? we just bail out below
					// per https://developer.mozilla.org/en-US/docs/Web/API/Request/Request, this can be a
					// Blob, BufferSource, FormData, URLSearchParams, USVString, or ReadableStream object.
					// non-string bodies are irksome to deal with, but luckily aren't particularly useful
					// in this context anyway, so we take the easy route and ban them
					throw new Error('Request body must be a string');
				}

				response = await respond(request, options, {
					prerender_default,
					...state,
					initiator: route
				});

				if (state.prerendering) {
					dependency = { response, body: null };
					state.prerendering.dependencies.set(url.pathname, dependency);
				}

				const set_cookie = response.headers.get('set-cookie');
				if (set_cookie) {
					set_cookies.push(
						...set_cookie_parser.splitCookiesString(set_cookie).map((str) => {
							const { name, value, ...options } = set_cookie_parser.parseString(str);
							// options.sameSite is string, something more specific is required - type cast is safe
							return /** @type{import('./types').Cookie} */ ({ name, value, options });
						})
					);
				}

				return response;
			}
		});

		const proxy = new Proxy(response, {
			get(response, key, _receiver) {
				async function text() {
					const body = await response.text();

					if (!body || typeof body === 'string') {
						const status_number = Number(response.status);
						if (isNaN(status_number)) {
							throw new Error(
								`response.status is not a number. value: "${
									response.status
								}" type: ${typeof response.status}`
							);
						}

						fetched.push({
							url: request.url.startsWith(event.url.origin)
								? request.url.slice(event.url.origin.length)
								: request.url,
							method: request.method,
							request_body: /** @type {string | undefined} */ (request_body),
							response_body: body,
							response: response
						});

						// ensure that excluded headers can't be read
						const get = response.headers.get;
						response.headers.get = (key) => {
							const lower = key.toLowerCase();
							const value = get.call(response.headers, lower);
							if (value && !lower.startsWith('x-sveltekit-')) {
								const included = resolve_opts.filterSerializedResponseHeaders(lower, value);
								if (!included) {
									throw new Error(
										`Failed to get response header "${lower}" — it must be included by the \`filterSerializedResponseHeaders\` option: https://kit.svelte.dev/docs/hooks#handle`
									);
								}
							}

							return value;
						};
					}

					if (dependency) {
						dependency.body = body;
					}

					return body;
				}

				if (key === 'arrayBuffer') {
					return async () => {
						const buffer = await response.arrayBuffer();

						if (dependency) {
							dependency.body = new Uint8Array(buffer);
						}

						// TODO should buffer be inlined into the page (albeit base64'd)?
						// any conditions in which it shouldn't be?

						return buffer;
					};
				}

				if (key === 'text') {
					return text;
				}

				if (key === 'json') {
					return async () => {
						return JSON.parse(await text());
					};
				}

				// TODO arrayBuffer?

				return Reflect.get(response, key, response);
			}
		});

		return proxy;
	};

	return { fetcher, fetched, cookies: set_cookies };
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
