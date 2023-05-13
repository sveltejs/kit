import { DEV } from 'esm-env';
import { base } from '__sveltekit/paths';
import { is_endpoint_request, render_endpoint } from './endpoint.js';
import { render_page } from './page/index.js';
import { render_response } from './page/render.js';
import { respond_with_error } from './page/respond_with_error.js';
import { is_form_content_type } from '../../utils/http.js';
import { handle_fatal_error, redirect_response } from './utils.js';
import {
	decode_pathname,
	decode_params,
	disable_search,
	has_data_suffix,
	normalize_path,
	strip_data_suffix
} from '../../utils/url.js';
import { exec } from '../../utils/routing.js';
import { redirect_json_response, render_data } from './data/index.js';
import { add_cookies_to_headers, get_cookies } from './cookie.js';
import { create_fetch } from './fetch.js';
import { Redirect } from '../control.js';
import {
	validate_layout_exports,
	validate_layout_server_exports,
	validate_page_exports,
	validate_page_server_exports,
	validate_server_exports
} from '../../utils/exports.js';
import { get_option } from '../../utils/options.js';
import { error, json, text } from '../../exports/index.js';
import { action_json_redirect, is_action_json_request } from './page/actions.js';
import { INVALIDATED_PARAM } from '../shared.js';

/* global __SVELTEKIT_ADAPTER_NAME__ */

/** @type {import('types').RequiredResolveOptions['transformPageChunk']} */
const default_transform = ({ html }) => html;

/** @type {import('types').RequiredResolveOptions['filterSerializedResponseHeaders']} */
const default_filter = () => false;

/** @type {import('types').RequiredResolveOptions['preload']} */
const default_preload = ({ type }) => type === 'js' || type === 'css';

/**
 * @param {Request} request
 * @param {import('types').SSROptions} options
 * @param {import('types').SSRManifest} manifest
 * @param {import('types').SSRState} state
 * @returns {Promise<Response>}
 */
export async function respond(request, options, manifest, state) {
	/** URL but stripped from the potential `/__data.json` suffix and its search param  */
	let url = new URL(request.url);

	if (options.csrf_check_origin) {
		const forbidden =
			is_form_content_type(request) &&
			(request.method === 'POST' ||
				request.method === 'PUT' ||
				request.method === 'PATCH' ||
				request.method === 'DELETE') &&
			request.headers.get('origin') !== url.origin;

		if (forbidden) {
			const csrf_error = error(403, `Cross-site ${request.method} form submissions are forbidden`);
			if (request.headers.get('accept') === 'application/json') {
				return json(csrf_error.body, { status: csrf_error.status });
			}
			return text(csrf_error.body.message, { status: csrf_error.status });
		}
	}

	let decoded;
	try {
		decoded = decode_pathname(url.pathname);
	} catch {
		return text('Malformed URI', { status: 400 });
	}

	/** @type {import('types').SSRRoute | null} */
	let route = null;

	/** @type {Record<string, string>} */
	let params = {};

	if (base && !state.prerendering?.fallback) {
		if (!decoded.startsWith(base)) {
			return text('Not found', { status: 404 });
		}
		decoded = decoded.slice(base.length) || '/';
	}

	const is_data_request = has_data_suffix(decoded);
	/** @type {boolean[] | undefined} */
	let invalidated_data_nodes;
	if (is_data_request) {
		decoded = strip_data_suffix(decoded) || '/';
		url.pathname = strip_data_suffix(url.pathname) || '/';
		invalidated_data_nodes = url.searchParams
			.get(INVALIDATED_PARAM)
			?.split('')
			.map((node) => node === '1');
		url.searchParams.delete(INVALIDATED_PARAM);
	}

	if (!state.prerendering?.fallback) {
		// TODO this could theoretically break — should probably be inside a try-catch
		const matchers = await manifest._.matchers();

		for (const candidate of manifest._.routes) {
			const match = candidate.pattern.exec(decoded);
			if (!match) continue;

			const matched = exec(match, candidate.params, matchers);
			if (matched) {
				route = candidate;
				params = decode_params(matched);
				break;
			}
		}
	}

	/** @type {import('types').TrailingSlash | void} */
	let trailing_slash = undefined;

	/** @type {Record<string, string>} */
	const headers = {};

	/** @type {Record<string, import('./page/types').Cookie>} */
	let cookies_to_add = {};

	/** @type {import('types').RequestEvent} */
	const event = {
		// @ts-expect-error `cookies` and `fetch` need to be created after the `event` itself
		cookies: null,
		// @ts-expect-error
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
		route: { id: route?.id ?? null },
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
		url,
		isDataRequest: is_data_request
	};

	/** @type {import('types').RequiredResolveOptions} */
	let resolve_opts = {
		transformPageChunk: default_transform,
		filterSerializedResponseHeaders: default_filter,
		preload: default_preload
	};

	try {
		// determine whether we need to redirect to add/remove a trailing slash
		if (route) {
			// if `paths.base === '/a/b/c`, then the root route is `/a/b/c/`,
			// regardless of the `trailingSlash` route option
			if (url.pathname === base || url.pathname === base + '/') {
				trailing_slash = 'always';
			} else if (route.page) {
				const nodes = await Promise.all([
					// we use == here rather than === because [undefined] serializes as "[null]"
					...route.page.layouts.map((n) => (n == undefined ? n : manifest._.nodes[n]())),
					manifest._.nodes[route.page.leaf]()
				]);

				if (DEV) {
					const layouts = nodes.slice(0, -1);
					const page = nodes.at(-1);

					for (const layout of layouts) {
						if (layout) {
							validate_layout_server_exports(
								layout.server,
								/** @type {string} */ (layout.server_id)
							);
							validate_layout_exports(
								layout.universal,
								/** @type {string} */ (layout.universal_id)
							);
						}
					}

					if (page) {
						validate_page_server_exports(page.server, /** @type {string} */ (page.server_id));
						validate_page_exports(page.universal, /** @type {string} */ (page.universal_id));
					}
				}

				trailing_slash = get_option(nodes, 'trailingSlash');
			} else if (route.endpoint) {
				const node = await route.endpoint();
				trailing_slash = node.trailingSlash;

				if (DEV) {
					validate_server_exports(node, /** @type {string} */ (route.endpoint_id));
				}
			}

			if (!is_data_request) {
				const normalized = normalize_path(url.pathname, trailing_slash ?? 'never');

				if (normalized !== url.pathname && !state.prerendering?.fallback) {
					return new Response(undefined, {
						status: 308,
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
		}

		const { cookies, new_cookies, get_cookie_header, set_internal } = get_cookies(
			request,
			url,
			trailing_slash ?? 'never'
		);

		cookies_to_add = new_cookies;
		event.cookies = cookies;
		event.fetch = create_fetch({
			event,
			options,
			manifest,
			state,
			get_cookie_header,
			set_internal
		});

		if (state.prerendering && !state.prerendering.fallback) disable_search(url);

		const response = await options.hooks.handle({
			event,
			resolve: (event, opts) =>
				resolve(event, opts).then((response) => {
					// add headers/cookies here, rather than inside `resolve`, so that we
					// can do it once for all responses instead of once per `return`
					for (const key in headers) {
						const value = headers[key];
						response.headers.set(key, /** @type {string} */ (value));
					}

					add_cookies_to_headers(response.headers, Object.values(cookies_to_add));

					if (state.prerendering && event.route.id !== null) {
						response.headers.set('x-sveltekit-routeid', encodeURI(event.route.id));
					}

					return response;
				})
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

		// Edge case: If user does `return Response(30x)` in handle hook while processing a data request,
		// we need to transform the redirect response to a corresponding JSON response.
		if (is_data_request && response.status >= 300 && response.status <= 308) {
			const location = response.headers.get('location');
			if (location) {
				return redirect_json_response(new Redirect(/** @type {any} */ (response.status), location));
			}
		}

		return response;
	} catch (e) {
		if (e instanceof Redirect) {
			const response = is_data_request
				? redirect_json_response(e)
				: route?.page && is_action_json_request(event)
				? action_json_redirect(e)
				: redirect_response(e.status, e.location);
			add_cookies_to_headers(response.headers, Object.values(cookies_to_add));
			return response;
		}
		return await handle_fatal_error(event, options, e);
	}

	/**
	 *
	 * @param {import('types').RequestEvent} event
	 * @param {import('types').ResolveOptions} [opts]
	 */
	async function resolve(event, opts) {
		try {
			if (opts) {
				if ('ssr' in opts) {
					throw new Error(
						'ssr has been removed, set it in the appropriate +layout.js instead. See the PR for more information: https://github.com/sveltejs/kit/pull/6197'
					);
				}

				resolve_opts = {
					transformPageChunk: opts.transformPageChunk || default_transform,
					filterSerializedResponseHeaders: opts.filterSerializedResponseHeaders || default_filter,
					preload: opts.preload || default_preload
				};
			}

			if (state.prerendering?.fallback) {
				return await render_response({
					event,
					options,
					manifest,
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
					response = await render_data(
						event,
						route,
						options,
						manifest,
						state,
						invalidated_data_nodes,
						trailing_slash ?? 'never'
					);
				} else if (route.endpoint && (!route.page || is_endpoint_request(event))) {
					response = await render_endpoint(event, await route.endpoint(), state);
				} else if (route.page) {
					response = await render_page(event, route.page, options, manifest, state, resolve_opts);
				} else {
					// a route will always have a page or an endpoint, but TypeScript
					// doesn't know that
					throw new Error('This should never happen');
				}

				return response;
			}

			if (state.error) {
				return text('Internal Server Error', {
					status: 500
				});
			}

			// if this request came direct from the user, rather than
			// via our own `fetch`, render a 404 page
			if (state.depth === 0) {
				return await respond_with_error({
					event,
					options,
					manifest,
					state,
					status: 404,
					error: new Error(`Not found: ${event.url.pathname}`),
					resolve_opts
				});
			}

			if (state.prerendering) {
				return text('not found', { status: 404 });
			}

			// we can't load the endpoint from our own manifest,
			// so we need to make an actual HTTP request
			return await fetch(request);
		} catch (e) {
			// TODO if `e` is instead named `error`, some fucked up Vite transformation happens
			// and I don't even know how to describe it. need to investigate at some point

			// HttpError from endpoint can end up here - TODO should it be handled there instead?
			return await handle_fatal_error(event, options, e);
		} finally {
			event.cookies.set = () => {
				throw new Error('Cannot use `cookies.set(...)` after the response has been generated');
			};

			event.setHeaders = () => {
				throw new Error('Cannot use `setHeaders(...)` after the response has been generated');
			};
		}
	}
}
