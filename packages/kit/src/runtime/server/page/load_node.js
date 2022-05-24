import * as cookie from 'cookie';
import * as set_cookie_parser from 'set-cookie-parser';
import { normalize } from '../../load.js';
import { respond } from '../index.js';
import { is_root_relative, resolve } from '../../../utils/url.js';
import { create_prerendering_url_proxy } from './utils.js';
import { is_pojo, lowercase_keys, normalize_request_method } from '../utils.js';
import { coalesce_to_error } from '../../../utils/error.js';
import { domain_matches, path_matches } from './cookie.js';

/**
 * @param {{
 *   event: import('types').RequestEvent;
 *   options: import('types').SSROptions;
 *   state: import('types').SSRState;
 *   route: import('types').SSRPage | null;
 *   node: import('types').SSRNode;
 *   $session: any;
 *   stuff: Record<string, any>;
 *   is_error: boolean;
 *   is_leaf: boolean;
 *   status?: number;
 *   error?: Error;
 * }} opts
 * @returns {Promise<import('./types').Loaded>}
 */
export async function load_node({
	event,
	options,
	state,
	route,
	node,
	$session,
	stuff,
	is_error,
	is_leaf,
	status,
	error
}) {
	const { module } = node;

	let uses_credentials = false;

	/** @type {Array<import('./types').Fetched>} */
	const fetched = [];

	const cookies = cookie.parse(event.request.headers.get('cookie') || '');

	/** @type {import('set-cookie-parser').Cookie[]} */
	const new_cookies = [];

	/** @type {import('types').LoadOutput} */
	let loaded;

	const should_prerender = node.module.prerender ?? options.prerender.default;

	/** @type {import('types').ShadowData} */
	const shadow = is_leaf
		? await load_shadow_data(
				/** @type {import('types').SSRPage} */ (route),
				event,
				options,
				should_prerender
		  )
		: {};

	if (shadow.cookies) {
		shadow.cookies.forEach((header) => {
			new_cookies.push(set_cookie_parser.parseString(header));
		});
	}

	if (shadow.error) {
		loaded = {
			status: shadow.status,
			error: shadow.error
		};
	} else if (shadow.redirect) {
		loaded = {
			status: shadow.status,
			redirect: shadow.redirect
		};
	} else if (module.load) {
		/** @type {import('types').LoadEvent} */
		const load_input = {
			url: state.prerendering ? create_prerendering_url_proxy(event.url) : event.url,
			params: event.params,
			props: shadow.body || {},
			routeId: event.routeId,
			get session() {
				if (node.module.prerender ?? options.prerender.default) {
					throw Error(
						'Attempted to access session from a prerendered page. Session would never be populated.'
					);
				}
				uses_credentials = true;
				return $session;
			},
			/**
			 * @param {RequestInfo} resource
			 * @param {RequestInit} opts
			 */
			fetch: async (resource, opts = {}) => {
				/** @type {string} */
				let requested;

				if (typeof resource === 'string') {
					requested = resource;
				} else {
					requested = resource.url;

					opts = {
						method: resource.method,
						headers: resource.headers,
						body: resource.body,
						mode: resource.mode,
						credentials: resource.credentials,
						cache: resource.cache,
						redirect: resource.redirect,
						referrer: resource.referrer,
						integrity: resource.integrity,
						...opts
					};
				}

				opts.headers = new Headers(opts.headers);

				// merge headers from request
				for (const [key, value] of event.request.headers) {
					if (
						key !== 'authorization' &&
						key !== 'cookie' &&
						key !== 'host' &&
						key !== 'if-none-match' &&
						!opts.headers.has(key)
					) {
						opts.headers.set(key, value);
					}
				}

				const resolved = resolve(event.url.pathname, requested.split('?')[0]);

				/** @type {Response} */
				let response;

				/** @type {import('types').PrerenderDependency} */
				let dependency;

				// handle fetch requests for static assets. e.g. prebaked data, etc.
				// we need to support everything the browser's fetch supports
				const prefix = options.paths.assets || options.paths.base;
				const filename = decodeURIComponent(
					resolved.startsWith(prefix) ? resolved.slice(prefix.length) : resolved
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

						response = new Response(options.read(file), {
							headers: type ? { 'content-type': type } : {}
						});
					} else {
						response = await fetch(
							`${event.url.origin}/${file}`,
							/** @type {RequestInit} */ (opts)
						);
					}
				} else if (is_root_relative(resolved)) {
					if (opts.credentials !== 'omit') {
						uses_credentials = true;

						const authorization = event.request.headers.get('authorization');

						// combine cookies from the initiating request with any that were
						// added via set-cookie
						const combined_cookies = { ...cookies };

						for (const cookie of new_cookies) {
							if (!domain_matches(event.url.hostname, cookie.domain)) continue;
							if (!path_matches(resolved, cookie.path)) continue;

							combined_cookies[cookie.name] = cookie.value;
						}

						const cookie = Object.entries(combined_cookies)
							.map(([name, value]) => `${name}=${value}`)
							.join('; ');

						if (cookie) {
							opts.headers.set('cookie', cookie);
						}

						if (authorization && !opts.headers.has('authorization')) {
							opts.headers.set('authorization', authorization);
						}
					}

					if (opts.body && typeof opts.body !== 'string') {
						// per https://developer.mozilla.org/en-US/docs/Web/API/Request/Request, this can be a
						// Blob, BufferSource, FormData, URLSearchParams, USVString, or ReadableStream object.
						// non-string bodies are irksome to deal with, but luckily aren't particularly useful
						// in this context anyway, so we take the easy route and ban them
						throw new Error('Request body must be a string');
					}

					response = await respond(
						// we set `credentials` to `undefined` to workaround a bug in Cloudflare
						// (https://github.com/sveltejs/kit/issues/3728) — which is fine, because
						// we only need the headers
						new Request(new URL(requested, event.url).href, { ...opts, credentials: undefined }),
						options,
						{
							...state,
							initiator: route
						}
					);

					if (state.prerendering) {
						dependency = { response, body: null };
						state.prerendering.dependencies.set(resolved, dependency);
					}
				} else {
					// external
					if (resolved.startsWith('//')) {
						requested = event.url.protocol + requested;
					}

					// external fetch
					// allow cookie passthrough for "same-origin"
					// if SvelteKit is serving my.domain.com:
					// -        domain.com WILL NOT receive cookies
					// -     my.domain.com WILL receive cookies
					// -    api.domain.dom WILL NOT receive cookies
					// - sub.my.domain.com WILL receive cookies
					// ports do not affect the resolution
					// leading dot prevents mydomain.com matching domain.com
					if (
						`.${new URL(requested).hostname}`.endsWith(`.${event.url.hostname}`) &&
						opts.credentials !== 'omit'
					) {
						uses_credentials = true;

						const cookie = event.request.headers.get('cookie');
						if (cookie) opts.headers.set('cookie', cookie);
					}

					const external_request = new Request(requested, /** @type {RequestInit} */ (opts));
					response = await options.hooks.externalFetch.call(null, external_request);
				}

				const set_cookie = response.headers.get('set-cookie');
				if (set_cookie) {
					new_cookies.push(
						...set_cookie_parser
							.splitCookiesString(set_cookie)
							.map((str) => set_cookie_parser.parseString(str))
					);
				}

				const proxy = new Proxy(response, {
					get(response, key, _receiver) {
						async function text() {
							const body = await response.text();

							/** @type {import('types').ResponseHeaders} */
							const headers = {};
							for (const [key, value] of response.headers) {
								// TODO skip others besides set-cookie and etag?
								if (key !== 'set-cookie' && key !== 'etag') {
									headers[key] = value;
								}
							}

							if (!opts.body || typeof opts.body === 'string') {
								const status_number = Number(response.status);
								if (isNaN(status_number)) {
									throw new Error(
										`response.status is not a number. value: "${
											response.status
										}" type: ${typeof response.status}`
									);
								}

								fetched.push({
									url: requested,
									body: opts.body,
									response: {
										status: status_number,
										statusText: response.statusText,
										headers,
										body
									}
								});
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
			},
			stuff: { ...stuff },
			status: is_error ? status ?? null : null,
			error: is_error ? error ?? null : null
		};

		if (options.dev) {
			// TODO remove this for 1.0
			Object.defineProperty(load_input, 'page', {
				get: () => {
					throw new Error('`page` in `load` functions has been replaced by `url` and `params`');
				}
			});
		}

		loaded = await module.load.call(null, load_input);

		if (!loaded) {
			// TODO do we still want to enforce this now that there's no fallthrough?
			throw new Error(`load function must return a value${options.dev ? ` (${node.entry})` : ''}`);
		}
	} else if (shadow.body) {
		loaded = {
			props: shadow.body
		};
	} else {
		loaded = {};
	}

	// generate __data.json files when prerendering
	if (shadow.body && state.prerendering) {
		const pathname = `${event.url.pathname.replace(/\/$/, '')}/__data.json`;

		const dependency = {
			response: new Response(undefined),
			body: JSON.stringify(shadow.body)
		};

		state.prerendering.dependencies.set(pathname, dependency);
	}

	return {
		node,
		props: shadow.body,
		loaded: normalize(loaded),
		stuff: loaded.stuff || stuff,
		fetched,
		set_cookie_headers: new_cookies.map((new_cookie) => {
			const { name, value, ...options } = new_cookie;
			// @ts-expect-error
			return cookie.serialize(name, value, options);
		}),
		uses_credentials
	};
}

/**
 *
 * @param {import('types').SSRPage} route
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSROptions} options
 * @param {boolean} prerender
 * @returns {Promise<import('types').ShadowData>}
 */
async function load_shadow_data(route, event, options, prerender) {
	if (!route.shadow) return {};

	try {
		const mod = await route.shadow();

		if (prerender && (mod.post || mod.put || mod.del || mod.patch)) {
			throw new Error('Cannot prerender pages that have endpoints with mutative methods');
		}

		const method = normalize_request_method(event);
		const is_get = method === 'head' || method === 'get';
		const handler = method === 'head' ? mod.head || mod.get : mod[method];

		if (!handler && !is_get) {
			return {
				status: 405,
				error: new Error(`${method} method not allowed`)
			};
		}

		/** @type {import('types').ShadowData} */
		const data = {
			status: 200,
			cookies: [],
			body: {}
		};

		if (!is_get) {
			const result = await handler(event);

			// TODO remove for 1.0
			// @ts-expect-error
			if (result.fallthrough) {
				throw new Error(
					'fallthrough is no longer supported. Use matchers instead: https://kit.svelte.dev/docs/routing#advanced-routing-matching'
				);
			}

			const { status, headers, body } = validate_shadow_output(result);
			data.status = status;

			add_cookies(/** @type {string[]} */ (data.cookies), headers);

			// Redirects are respected...
			if (status >= 300 && status < 400) {
				data.redirect = /** @type {string} */ (
					headers instanceof Headers ? headers.get('location') : headers.location
				);
				return data;
			}

			// ...but 4xx and 5xx status codes _don't_ result in the error page
			// rendering for non-GET requests — instead, we allow the page
			// to render with any validation errors etc that were returned
			data.body = body;
		}

		const get = (method === 'head' && mod.head) || mod.get;
		if (get) {
			const result = await get(event);

			// TODO remove for 1.0
			// @ts-expect-error
			if (result.fallthrough) {
				throw new Error(
					'fallthrough is no longer supported. Use matchers instead: https://kit.svelte.dev/docs/routing#advanced-routing-matching'
				);
			}

			const { status, headers, body } = validate_shadow_output(result);
			add_cookies(/** @type {string[]} */ (data.cookies), headers);
			data.status = status;

			if (status >= 400) {
				data.error = new Error('Failed to load data');
				return data;
			}

			if (status >= 300) {
				data.redirect = /** @type {string} */ (
					headers instanceof Headers ? headers.get('location') : headers.location
				);
				return data;
			}

			data.body = { ...body, ...data.body };
		}

		return data;
	} catch (e) {
		const error = coalesce_to_error(e);
		options.handle_error(error, event);

		return {
			status: 500,
			error
		};
	}
}

/**
 * @param {string[]} target
 * @param {Partial<import('types').ResponseHeaders>} headers
 */
function add_cookies(target, headers) {
	const cookies = headers['set-cookie'];
	if (cookies) {
		if (Array.isArray(cookies)) {
			target.push(...cookies);
		} else {
			target.push(/** @type {string} */ (cookies));
		}
	}
}

/**
 * @param {import('types').ShadowEndpointOutput} result
 */
function validate_shadow_output(result) {
	const { status = 200, body = {} } = result;
	let headers = result.headers || {};

	if (headers instanceof Headers) {
		if (headers.has('set-cookie')) {
			throw new Error(
				'Endpoint request handler cannot use Headers interface with Set-Cookie headers'
			);
		}
	} else {
		headers = lowercase_keys(/** @type {Record<string, string>} */ (headers));
	}

	if (!is_pojo(body)) {
		throw new Error('Body returned from endpoint request handler must be a plain object');
	}

	return { status, headers, body };
}
