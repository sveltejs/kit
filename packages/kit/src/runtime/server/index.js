import { render_endpoint } from './endpoint.js';
import { render_page } from './page/index.js';
import { render_response } from './page/render.js';
import { respond_with_error } from './page/respond_with_error.js';
import { coalesce_to_error, normalize_error } from '../../utils/error.js';
import { serialize_error, GENERIC_ERROR, error_to_pojo } from './utils.js';
import { decode_params, normalize_path } from '../../utils/url.js';
import { exec } from '../../utils/routing.js';
import { negotiate } from '../../utils/http.js';
import { HttpError, Redirect } from '../../index/private.js';
import { load_server_data } from './page/load_data.js';
import { json } from '../../index/index.js';
import { once } from '../../utils/functions.js';

/* global __SVELTEKIT_ADAPTER_NAME__ */

const DATA_SUFFIX = '/__data.json';

/** @param {{ html: string }} opts */
const default_transform = ({ html }) => html;

/** @type {import('types').Respond} */
export async function respond(request, options, state) {
	let url = new URL(request.url);

	const { parameter, allowed } = options.method_override;
	const method_override = url.searchParams.get(parameter)?.toUpperCase();

	if (method_override) {
		if (request.method === 'POST') {
			if (allowed.includes(method_override)) {
				request = new Proxy(request, {
					get: (target, property, _receiver) => {
						if (property === 'method') return method_override;
						return Reflect.get(target, property, target);
					}
				});
			} else {
				const verb = allowed.length === 0 ? 'enabled' : 'allowed';
				const body = `${parameter}=${method_override} is not ${verb}. See https://kit.svelte.dev/docs/configuration#methodoverride`;

				return new Response(body, {
					status: 400
				});
			}
		} else {
			throw new Error(`${parameter}=${method_override} is only allowed with POST requests`);
		}
	}

	let decoded;
	try {
		decoded = decodeURI(url.pathname);
	} catch {
		return new Response('Malformed URI', { status: 400 });
	}

	/** @type {import('types').SSRRoute | null} */
	let route = null;

	/** @type {Record<string, string>} */
	let params = {};

	if (options.paths.base && !state.prerendering?.fallback) {
		if (!decoded.startsWith(options.paths.base)) {
			return new Response('Not found', { status: 404 });
		}
		decoded = decoded.slice(options.paths.base.length) || '/';
	}

	const is_data_request = decoded.endsWith(DATA_SUFFIX);

	if (is_data_request) {
		const data_suffix_length = DATA_SUFFIX.length - (options.trailing_slash === 'always' ? 1 : 0);
		decoded = decoded.slice(0, -data_suffix_length) || '/';
		url = new URL(url.origin + url.pathname.slice(0, -data_suffix_length) + url.search);
	}

	if (!state.prerendering?.fallback) {
		const matchers = await options.manifest._.matchers();

		for (const candidate of options.manifest._.routes) {
			const match = candidate.pattern.exec(decoded);
			if (!match) continue;

			const matched = exec(match, candidate.names, candidate.types, matchers);
			if (matched) {
				route = candidate;
				params = decode_params(matched);
				break;
			}
		}
	}

	if (route) {
		if (route.page) {
			const normalized = normalize_path(url.pathname, options.trailing_slash);

			if (normalized !== url.pathname && !state.prerendering?.fallback) {
				return new Response(undefined, {
					status: 301,
					headers: {
						'x-sveltekit-normalize': '1',
						location:
							// ensure paths starting with '//' are not treated as protocol-relative
							(normalized.startsWith('//') ? url.origin + normalized : normalized) +
							(url.search === '?' ? '' : url.search)
					}
				});
			}
		} else if (is_data_request) {
			// requesting /__data.json should fail for a standalone endpoint
			return new Response(undefined, {
				status: 404
			});
		}
	}

	/** @type {import('types').ResponseHeaders} */
	const headers = {};

	/** @type {string[]} */
	const cookies = [];

	/** @type {import('types').RequestEvent} */
	const event = {
		get clientAddress() {
			if (!state.getClientAddress) {
				throw new Error(
					`${__SVELTEKIT_ADAPTER_NAME__} does not specify getClientAddress. Please raise an issue`
				);
			}

			Object.defineProperty(event, 'clientAddress', {
				value: state.getClientAddress()
			});

			return event.clientAddress;
		},
		locals: {},
		params,
		platform: state.platform,
		request,
		routeId: route && route.id,
		setHeaders: (new_headers) => {
			for (const key in new_headers) {
				const lower = key.toLowerCase();
				const value = new_headers[key];

				if (lower === 'set-cookie') {
					const new_cookies = /** @type {string[]} */ (Array.isArray(value) ? value : [value]);

					for (const cookie of new_cookies) {
						if (cookies.includes(cookie)) {
							throw new Error(`"${key}" header already has cookie with same value`);
						}

						cookies.push(cookie);
					}
				} else if (lower in headers) {
					throw new Error(`"${key}" header is already set`);
				} else {
					headers[lower] = value;

					if (state.prerendering && lower === 'cache-control') {
						state.prerendering.cache = /** @type {string} */ (value);
					}
				}
			}
		},
		url
	};

	// TODO remove this for 1.0
	/**
	 * @param {string} property
	 * @param {string} replacement
	 * @param {string} suffix
	 */
	const removed = (property, replacement, suffix = '') => ({
		get: () => {
			throw new Error(`event.${property} has been replaced by event.${replacement}` + suffix);
		}
	});

	const details = '. See https://github.com/sveltejs/kit/pull/3384 for details';

	const body_getter = {
		get: () => {
			throw new Error(
				'To access the request body use the text/json/arrayBuffer/formData methods, e.g. `body = await request.json()`' +
					details
			);
		}
	};

	Object.defineProperties(event, {
		method: removed('method', 'request.method', details),
		headers: removed('headers', 'request.headers', details),
		origin: removed('origin', 'url.origin'),
		path: removed('path', 'url.pathname'),
		query: removed('query', 'url.searchParams'),
		body: body_getter,
		rawBody: body_getter
	});

	/** @type {import('types').RequiredResolveOptions} */
	let resolve_opts = {
		ssr: true,
		transformPageChunk: default_transform
	};

	// TODO match route before calling handle?

	try {
		const response = await options.hooks.handle({
			event,
			resolve: async (event, opts) => {
				if (opts) {
					// TODO remove for 1.0
					// @ts-expect-error
					if (opts.transformPage) {
						throw new Error(
							'transformPage has been replaced by transformPageChunk — see https://github.com/sveltejs/kit/pull/5657 for more information'
						);
					}

					resolve_opts = {
						ssr: opts.ssr !== false,
						transformPageChunk: opts.transformPageChunk || default_transform
					};
				}

				if (state.prerendering?.fallback) {
					return await render_response({
						event,
						options,
						state,
						page_config: { router: true, hydrate: true },
						status: 200,
						error: null,
						branch: [],
						fetched: [],
						validation_errors: undefined,
						cookies: [],
						resolve_opts: {
							...resolve_opts,
							ssr: false
						}
					});
				}

				if (route) {
					/** @type {Response} */
					let response;
					if (is_data_request && route.page) {
						try {
							const node_ids = [...route.page.layouts, route.page.leaf];

							const invalidated =
								request.headers.get('x-sveltekit-invalidated')?.split(',').map(Boolean) ??
								node_ids.map(() => true);

							let aborted = false;

							const functions = node_ids.map((n, i) => {
								return once(async () => {
									try {
										if (aborted) {
											return /** @type {import('types').ServerDataSkippedNode} */ ({
												type: 'skip'
											});
										}

										// == because it could be undefined (in dev) or null (in build, because of JSON.stringify)
										const node = n == undefined ? n : await options.manifest._.nodes[n]();
										return load_server_data({
											dev: options.dev,
											event,
											node,
											parent: async () => {
												/** @type {Record<string, any>} */
												const data = {};
												for (let j = 0; j < i; j += 1) {
													const parent = /** @type {import('types').ServerDataNode} */ (
														await functions[j]()
													);
													Object.assign(data, parent.data);
												}
												return data;
											}
										});
									} catch (e) {
										aborted = true;
										throw e;
									}
								});
							});

							const promises = functions.map(async (fn, i) => {
								if (!invalidated[i]) {
									return /** @type {import('types').ServerDataSkippedNode} */ ({
										type: 'skip'
									});
								}

								return fn();
							});

							let length = promises.length;
							const nodes = await Promise.all(
								promises.map((p, i) =>
									p.catch((e) => {
										const error = normalize_error(e);

										if (error instanceof Redirect) {
											throw error;
										}

										// Math.min because array isn't guaranteed to resolve in order
										length = Math.min(length, i + 1);

										if (error instanceof HttpError) {
											return /** @type {import('types').ServerErrorNode} */ ({
												type: 'error',
												httperror: { ...error }
											});
										}

										options.handle_error(error, event);

										return /** @type {import('types').ServerErrorNode} */ ({
											type: 'error',
											error: error_to_pojo(error, options.get_stack)
										});
									})
								)
							);

							/** @type {import('types').ServerData} */
							const server_data = {
								type: 'data',
								nodes: nodes.slice(0, length)
							};

							response = json(server_data);
						} catch (e) {
							const error = normalize_error(e);

							if (error instanceof Redirect) {
								/** @type {import('types').ServerData} */
								const server_data = {
									type: 'redirect',
									location: error.location
								};

								response = json(server_data);
							} else {
								response = json(error_to_pojo(error, options.get_stack), { status: 500 });
							}
						}
					} else if (route.page) {
						response = await render_page(event, route, route.page, options, state, resolve_opts);
					} else if (route.endpoint) {
						response = await render_endpoint(event, await route.endpoint());
					} else {
						// a route will always have a page or an endpoint, but TypeScript
						// doesn't know that
						throw new Error('This should never happen');
					}

					if (!is_data_request) {
						// we only want to set cookies on __data.json requests, we don't
						// want to cache stuff erroneously etc
						for (const key in headers) {
							const value = headers[key];
							response.headers.set(key, /** @type {string} */ (value));
						}
					}

					for (const cookie of cookies) {
						response.headers.append('set-cookie', cookie);
					}

					// respond with 304 if etag matches
					if (response.status === 200 && response.headers.has('etag')) {
						let if_none_match_value = request.headers.get('if-none-match');

						// ignore W/ prefix https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-None-Match#directives
						if (if_none_match_value?.startsWith('W/"')) {
							if_none_match_value = if_none_match_value.substring(2);
						}

						const etag = /** @type {string} */ (response.headers.get('etag'));

						if (if_none_match_value === etag) {
							const headers = new Headers({ etag });

							// https://datatracker.ietf.org/doc/html/rfc7232#section-4.1
							for (const key of ['cache-control', 'content-location', 'date', 'expires', 'vary']) {
								const value = response.headers.get(key);
								if (value) headers.set(key, value);
							}

							return new Response(undefined, {
								status: 304,
								headers
							});
						}
					}

					return response;
				}

				if (state.initiator === GENERIC_ERROR) {
					return new Response('Internal Server Error', {
						status: 500
					});
				}

				// if this request came direct from the user, rather than
				// via a `fetch` in a `load`, render a 404 page
				if (!state.initiator) {
					return await respond_with_error({
						event,
						options,
						state,
						status: 404,
						error: new Error(`Not found: ${event.url.pathname}`),
						resolve_opts
					});
				}

				if (state.prerendering) {
					return new Response('not found', { status: 404 });
				}

				// we can't load the endpoint from our own manifest,
				// so we need to make an actual HTTP request
				return await fetch(request);
			},

			// TODO remove for 1.0
			// @ts-expect-error
			get request() {
				throw new Error('request in handle has been replaced with event' + details);
			}
		});

		// TODO for 1.0, change the error message to point to docs rather than PR
		if (response && !(response instanceof Response)) {
			throw new Error('handle must return a Response object' + details);
		}

		return response;
	} catch (/** @type {unknown} */ e) {
		const error = coalesce_to_error(e);

		options.handle_error(error, event);

		const type = negotiate(event.request.headers.get('accept') || 'text/html', [
			'text/html',
			'application/json'
		]);

		if (is_data_request || type === 'application/json') {
			return new Response(serialize_error(error, options.get_stack), {
				status: 500,
				headers: { 'content-type': 'application/json; charset=utf-8' }
			});
		}

		// TODO is this necessary? should we just return a plain 500 at this point?
		try {
			return await respond_with_error({
				event,
				options,
				state,
				status: 500,
				error,
				resolve_opts
			});
		} catch (/** @type {unknown} */ e) {
			const error = coalesce_to_error(e);

			return new Response(options.dev ? error.stack : error.message, {
				status: 500
			});
		}
	}
}
