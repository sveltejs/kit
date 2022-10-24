import { is_endpoint_request, render_endpoint } from './endpoint.js';
import { render_page } from './page/index.js';
import { render_response } from './page/render.js';
import { respond_with_error } from './page/respond_with_error.js';
import { coalesce_to_error } from '../../utils/error.js';
import { is_form_content_type } from '../../utils/http.js';
import { GENERIC_ERROR, handle_fatal_error } from './utils.js';
import { decode_params, disable_search, normalize_path } from '../../utils/url.js';
import { exec } from '../../utils/routing.js';
import { render_data } from './data/index.js';
import { DATA_SUFFIX } from '../../constants.js';
import { add_cookies_to_headers, get_cookies } from './cookie.js';
import { HttpError } from '../control.js';
import { create_fetch } from './fetch.js';

/* global __SVELTEKIT_ADAPTER_NAME__ */

/** @param {{ html: string }} opts */
const default_transform = ({ html }) => html;

const default_filter = () => false;

/** @type {import('types').Respond} */
export async function respond(request, options, state) {
	let url = new URL(request.url);

	if (options.csrf.check_origin) {
		const forbidden =
			request.method === 'POST' &&
			request.headers.get('origin') !== url.origin &&
			is_form_content_type(request);

		if (forbidden) {
			return new Response(`Cross-site ${request.method} form submissions are forbidden`, {
				status: 403
			});
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
	if (is_data_request) decoded = decoded.slice(0, -DATA_SUFFIX.length) || '/';

	if (!state.prerendering?.fallback) {
		const matchers = await options.manifest._.matchers();

		for (const candidate of options.manifest._.routes) {
			const match = candidate.pattern.exec(decoded);
			if (!match) continue;

			const matched = exec(match, candidate.id, candidate.names, candidate.types, matchers);
			if (matched) {
				route = candidate;
				params = decode_params(matched);
				break;
			}
		}
	}

	if (route?.page && !is_data_request) {
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
	}

	/** @type {Record<string, string>} */
	const headers = {};

	const { cookies, new_cookies, get_cookie_header } = get_cookies(request, url);

	if (state.prerendering) disable_search(url);

	/** @type {import('types').RequestEvent} */
	const event = {
		cookies,
		// @ts-expect-error this is added in the next step, because `create_fetch` needs a reference to `event`
		fetch: null,
		getClientAddress:
			state.getClientAddress ||
			(() => {
				throw new Error(
					`${__SVELTEKIT_ADAPTER_NAME__} does not specify getClientAddress. Please raise an issue`
				);
			}),
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
					throw new Error(
						`Use \`event.cookies.set(name, value, options)\` instead of \`event.setHeaders\` to set cookies`
					);
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

	event.fetch = create_fetch({ event, options, state, get_cookie_header });

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
		clientAddress: removed('clientAddress', 'getClientAddress'),
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
		transformPageChunk: default_transform,
		filterSerializedResponseHeaders: default_filter
	};

	/**
	 *
	 * @param {import('types').RequestEvent} event
	 * @param {import('types').ResolveOptions} [opts]
	 */
	async function resolve(event, opts) {
		try {
			if (opts) {
				// TODO remove for 1.0
				if ('transformPage' in opts) {
					throw new Error(
						'transformPage has been replaced by transformPageChunk — see https://github.com/sveltejs/kit/pull/5657 for more information'
					);
				}

				if ('ssr' in opts) {
					throw new Error(
						'ssr has been removed, set it in the appropriate +layout.js instead. See the PR for more information: https://github.com/sveltejs/kit/pull/6197'
					);
				}

				resolve_opts = {
					transformPageChunk: opts.transformPageChunk || default_transform,
					filterSerializedResponseHeaders: opts.filterSerializedResponseHeaders || default_filter
				};
			}

			if (state.prerendering?.fallback) {
				return await render_response({
					event,
					options,
					state,
					page_config: { ssr: false, csr: true },
					status: 200,
					error: null,
					branch: [],
					fetched: [],
					resolve_opts
				});
			}

			if (route) {
				/** @type {Response} */
				let response;

				if (is_data_request) {
					response = await render_data(event, route, options, state);
				} else if (route.endpoint && (!route.page || is_endpoint_request(event))) {
					response = await render_endpoint(event, await route.endpoint(), state);
				} else if (route.page) {
					response = await render_page(event, route, route.page, options, state, resolve_opts);
				} else {
					// a route will always have a page or an endpoint, but TypeScript
					// doesn't know that
					throw new Error('This should never happen');
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
		} catch (e) {
			// HttpError can come from endpoint - TODO should it be handled there instead?
			const error = e instanceof HttpError ? e : coalesce_to_error(e);
			return handle_fatal_error(event, options, error);
		} finally {
			event.cookies.set = () => {
				throw new Error('Cannot use `cookies.set(...)` after the response has been generated');
			};

			event.setHeaders = () => {
				throw new Error('Cannot use `setHeaders(...)` after the response has been generated');
			};
		}
	}

	try {
		const response = await options.hooks.handle({
			event,
			resolve: (event, opts) =>
				resolve(event, opts).then((response) => {
					// add headers/cookies here, rather than inside `resolve`, so that we
					// can do it once for all responses instead of once per `return`
					if (!is_data_request) {
						// we only want to set cookies on __data.json requests, we don't
						// want to cache stuff erroneously etc
						for (const key in headers) {
							const value = headers[key];
							response.headers.set(key, /** @type {string} */ (value));
						}
					}
					add_cookies_to_headers(response.headers, Object.values(new_cookies));

					if (state.prerendering && event.routeId !== null) {
						response.headers.set('x-sveltekit-routeid', encodeURI(event.routeId));
					}

					return response;
				}),
			// TODO remove for 1.0
			// @ts-expect-error
			get request() {
				throw new Error('request in handle has been replaced with event' + details);
			}
		});

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

				// https://datatracker.ietf.org/doc/html/rfc7232#section-4.1 + set-cookie
				for (const key of [
					'cache-control',
					'content-location',
					'date',
					'expires',
					'vary',
					'set-cookie'
				]) {
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
	} catch (/** @type {unknown} */ e) {
		const error = coalesce_to_error(e);
		return handle_fatal_error(event, options, error);
	}
}
