import { normalize } from '../../load.js';
import { respond } from '../index.js';
import { s } from '../../../utils/misc.js';
import { escape_json_in_html } from '../../../utils/escape.js';
import { is_root_relative, resolve } from '../../../utils/url.js';
import { create_prerendering_url_proxy } from './utils.js';
import { is_pojo, lowercase_keys, normalize_request_method } from '../utils.js';
import { coalesce_to_error } from '../../../utils/error.js';

/**
 * @param {{
 *   event: import('types').RequestEvent;
 *   options: import('types').SSROptions;
 *   state: import('types').SSRState;
 *   route: import('types').SSRPage | null;
 *   url: URL;
 *   params: Record<string, string>;
 *   node: import('types').SSRNode;
 *   $session: any;
 *   stuff: Record<string, any>;
 *   is_error: boolean;
 *   is_leaf: boolean;
 *   status?: number;
 *   error?: Error;
 * }} opts
 * @returns {Promise<import('./types').Loaded | undefined>} undefined for fallthrough
 */
export async function load_node({
	event,
	options,
	state,
	route,
	url,
	params,
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

	/**
	 * @type {Array<{
	 *   url: string;
	 *   body: string;
	 *   json: string;
	 * }>}
	 */
	const fetched = [];

	/**
	 * @type {string[]}
	 */
	let set_cookie_headers = [];

	/** @type {import('types').Either<import('types').Fallthrough, import('types').LoadOutput>} */
	let loaded;

	/** @type {import('types').ShadowData} */
	const shadow = is_leaf
		? await load_shadow_data(
				/** @type {import('types').SSRPage} */ (route),
				event,
				options,
				!!state.prerender
		  )
		: {};

	if (shadow.fallthrough) return;

	if (shadow.cookies) {
		set_cookie_headers.push(...shadow.cookies);
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
		/** @type {import('types').LoadInput | import('types').ErrorLoadInput} */
		const load_input = {
			url: state.prerender ? create_prerendering_url_proxy(url) : url,
			params,
			props: shadow.body || {},
			get session() {
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

				opts.headers.set('referer', event.url.href);

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
							? options.manifest._.mime[filename.slice(filename.lastIndexOf('.'))]
							: 'text/html';

						response = new Response(options.read(file), {
							headers: type ? { 'content-type': type } : {}
						});
					} else {
						response = await fetch(`${url.origin}/${file}`, /** @type {RequestInit} */ (opts));
					}
				} else if (is_root_relative(resolved)) {
					if (opts.credentials !== 'omit') {
						uses_credentials = true;

						const cookie = event.request.headers.get('cookie');
						const authorization = event.request.headers.get('authorization');

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

					response = await respond(new Request(new URL(requested, event.url).href, opts), options, {
						fetched: requested,
						initiator: route
					});

					if (state.prerender) {
						dependency = { response, body: null };
						state.prerender.dependencies.set(resolved, dependency);
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

				const proxy = new Proxy(response, {
					get(response, key, _receiver) {
						async function text() {
							const body = await response.text();

							/** @type {import('types').ResponseHeaders} */
							const headers = {};
							for (const [key, value] of response.headers) {
								if (key === 'set-cookie') {
									set_cookie_headers = set_cookie_headers.concat(value);
								} else if (key !== 'etag') {
									headers[key] = value;
								}
							}

							if (!opts.body || typeof opts.body === 'string') {
								// the json constructed below is later added to the dom in a script tag
								// make sure the used values are safe
								const status_number = Number(response.status);
								if (isNaN(status_number)) {
									throw new Error(
										`response.status is not a number. value: "${
											response.status
										}" type: ${typeof response.status}`
									);
								}
								// prettier-ignore
								fetched.push({
									url: requested,
									body: /** @type {string} */ (opts.body),
									json: `{"status":${status_number},"statusText":${s(response.statusText)},"headers":${s(headers)},"body":${escape_json_in_html(body)}}`
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
			stuff: { ...stuff }
		};

		if (options.dev) {
			// TODO remove this for 1.0
			Object.defineProperty(load_input, 'page', {
				get: () => {
					throw new Error('`page` in `load` functions has been replaced by `url` and `params`');
				}
			});
		}

		if (is_error) {
			/** @type {import('types').ErrorLoadInput} */ (load_input).status = status;
			/** @type {import('types').ErrorLoadInput} */ (load_input).error = error;
		}

		loaded = await module.load.call(null, load_input);

		if (!loaded) {
			throw new Error(`load function must return a value${options.dev ? ` (${node.entry})` : ''}`);
		}
	} else if (shadow.body) {
		loaded = {
			props: shadow.body
		};
	} else {
		loaded = {};
	}

	if (loaded.fallthrough && !is_error) {
		return;
	}

	// generate __data.json files when prerendering
	if (shadow.body && state.prerender) {
		const pathname = `${event.url.pathname}/__data.json`;

		const dependency = {
			response: new Response(undefined),
			body: JSON.stringify(shadow.body)
		};

		state.prerender.dependencies.set(pathname, dependency);
	}

	return {
		node,
		props: shadow.body,
		loaded: normalize(loaded),
		stuff: loaded.stuff || stuff,
		fetched,
		set_cookie_headers,
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

			if (result.fallthrough) return result;

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

			if (result.fallthrough) return result;

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
