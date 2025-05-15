import { app_dir, base } from '__sveltekit/paths';
import { DEV } from 'esm-env';
import { json, text } from '../../exports/index.js';
import { validate_server_exports } from '../../utils/exports.js';
import { is_form_content_type } from '../../utils/http.js';
import { PageNodes } from '../../utils/page_nodes.js';
import { exec } from '../../utils/routing.js';
import { decode_params, decode_pathname, normalize_path } from '../../utils/url.js';
import { HttpError, Redirect } from '../control.js';
import {
	add_data_suffix,
	add_resolution_suffix,
	has_data_suffix,
	has_resolution_suffix,
	strip_data_suffix,
	strip_resolution_suffix
} from '../pathname.js';
import { add_cookies_to_headers, get_cookies } from '../server/cookie.js';
import {
	handle_fatal_error,
	has_prerendered_path,
	method_not_allowed,
	redirect_response
} from './utils.js';
import { validateHeaders } from '../server/validate-headers.js';
import { INVALIDATED_PARAM, TRAILING_SLASH_PARAM } from '../shared.js';
import { redirect_json_response, render_data } from './data/index.js';
import { get_public_env } from './env_module.js';
import { create_fetch } from './fetch.js';
import { action_json_redirect, is_action_json_request } from './page/actions.js';
import { render_page } from './page/index.js';
import { render_response } from './page/render.js';
import { resolve_route } from './page/server_routing.js';
import { is_endpoint_request } from './endpoint.js';

/* global __SVELTEKIT_DEV__ */

/** @type {import('types').RequiredResolveOptions['transformPageChunk']} */
const default_transform = ({ html }) => html;

/** @type {import('types').RequiredResolveOptions['filterSerializedResponseHeaders']} */
const default_filter = () => false;

/** @type {import('types').RequiredResolveOptions['preload']} */
const default_preload = ({ type }) => type === 'js' || type === 'css';

const page_methods = new Set(['GET', 'HEAD', 'POST']);

const allowed_page_methods = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * @param {Request} request
 * @param {import('types').SWROptions} options
 * @param {import('types').SWRManifest} manifest
 * @param {import('types').SWRState} state
 * @returns {Promise<Response>}
 */
export async function respond(request, options, manifest, state) {
	/** URL but stripped from the potential `/__data.json` suffix and its search param  */
	const url = new URL(request.url);

	if (options.csrf_check_origin) {
		const forbidden =
			is_form_content_type(request) &&
			(request.method === 'POST' ||
				request.method === 'PUT' ||
				request.method === 'PATCH' ||
				request.method === 'DELETE') &&
			request.headers.get('origin') !== url.origin;

		if (forbidden) {
			const csrf_error = new HttpError(
				403,
				`Cross-site ${request.method} form submissions are forbidden`
			);
			if (request.headers.get('accept') === 'application/json') {
				return json(csrf_error.body, { status: csrf_error.status });
			}
			return text(csrf_error.body.message, { status: csrf_error.status });
		}
	}

	if (options.hash_routing && url.pathname !== base + '/' && url.pathname !== '/[fallback]') {
		return text('Not found', { status: 404 });
	}

	/** @type {boolean[] | undefined} */
	let invalidated_data_nodes;

	/**
	 * If the request is for a route resolution, first modify the URL, then continue as normal
	 * for path resolution, then return the route object as a JS file.
	 */
	const is_route_resolution_request = has_resolution_suffix(url.pathname);
	const is_data_request = has_data_suffix(url.pathname);

	if (is_route_resolution_request) {
		url.pathname = strip_resolution_suffix(url.pathname);
	} else if (is_data_request) {
		url.pathname =
			strip_data_suffix(url.pathname) +
				(url.searchParams.get(TRAILING_SLASH_PARAM) === '1' ? '/' : '') || '/';
		url.searchParams.delete(TRAILING_SLASH_PARAM);
		invalidated_data_nodes = url.searchParams
			.get(INVALIDATED_PARAM)
			?.split('')
			.map((node) => node === '1');
		url.searchParams.delete(INVALIDATED_PARAM);
	}

	/** @type {Record<string, string>} */
	const headers = {};

	const { cookies, new_cookies, get_cookie_header, set_internal, set_trailing_slash } = get_cookies(
		request,
		url
	);

	/** @type {import('types').SWRequestEvent} */
	const event = {
		cookies,
		// @ts-expect-error `fetch` needs to be created after the `event` itself
		fetch: null,
		params: {},
		request,
		route: { id: null },
		setHeaders: (new_headers) => {
			if (__SVELTEKIT_DEV__) {
				validateHeaders(new_headers);
			}

			for (const key in new_headers) {
				const lower = key.toLowerCase();
				const value = new_headers[key];

				if (lower === 'set-cookie') {
					throw new Error(
						'Use `event.cookies.set(name, value, options)` instead of `event.setHeaders` to set cookies'
					);
				} else if (lower in headers) {
					throw new Error(`"${key}" header is already set`);
				} else {
					headers[lower] = value;
				}
			}
		},
		url
	};

	event.fetch = create_fetch({
		event,
		options,
		manifest,
		state,
		get_cookie_header,
		set_internal
	});

	let resolved_path;

	try {
		// reroute could alter the given URL, so we pass a copy
		resolved_path =
			(await options.hooks.reroute({ url: new URL(url), fetch: event.fetch })) ?? url.pathname;
	} catch {
		return text('Internal Server Error', {
			status: 500
		});
	}

	try {
		resolved_path = decode_pathname(resolved_path);
	} catch {
		return text('Malformed URI', { status: 400 });
	}

	if (resolved_path !== url.pathname && has_prerendered_path(manifest, resolved_path)) {
		const url = new URL(request.url);
		url.pathname = is_data_request
			? add_data_suffix(resolved_path)
			: is_route_resolution_request
				? add_resolution_suffix(resolved_path)
				: resolved_path;

		// `fetch` automatically decodes the body, so we need to delete the related headers to not break the response
		// Also see https://github.com/sveltejs/kit/issues/12197 for more info (we should fix this more generally at some point)
		const response = await fetch(url, request);
		const headers = new Headers(response.headers);
		if (headers.has('content-encoding')) {
			headers.delete('content-encoding');
			headers.delete('content-length');
		}

		return new Response(response.body, {
			headers,
			status: response.status,
			statusText: response.statusText
		});
	}

	/** @type {import('types').SWRRoute | null} */
	let route = null;

	if (base) {
		if (!resolved_path.startsWith(base)) {
			return text('Not found', { status: 404 });
		}
		resolved_path = resolved_path.slice(base.length) || '/';
	}

	if (is_route_resolution_request) {
		return resolve_route(resolved_path, new URL(request.url), manifest);
	}

	if (resolved_path === `/${app_dir}/env.js`) {
		return get_public_env(request);
	}

	if (resolved_path.startsWith(`/${app_dir}`)) {
		// Ensure that 404'd static assets are not cached - some adapters might apply caching by default
		const headers = new Headers();
		headers.set('cache-control', 'public, max-age=0, must-revalidate');
		return text('Not found', { status: 404, headers });
	}

	// TODO this could theoretically break — should probably be inside a try-catch
	const matchers = await manifest.matchers();

	for (const candidate of manifest.routes) {
		const match = candidate.pattern.exec(resolved_path);
		if (!match) continue;

		const matched = exec(match, candidate.params, matchers);
		if (matched) {
			route = candidate;
			event.route = { id: route.id };
			event.params = decode_params(matched);
			break;
		}
	}

	/** @type {import('types').RequiredResolveOptions} */
	let resolve_opts = {
		transformPageChunk: default_transform,
		filterSerializedResponseHeaders: default_filter,
		preload: default_preload
	};

	/** @type {import('types').TrailingSlash} */
	let trailing_slash = 'never';

	try {
		/** @type {PageNodes|undefined} */
		const page_nodes = route?.page
			? new PageNodes(await load_page_nodes(route.page, manifest))
			: undefined;

		// determine whether we need to redirect to add/remove a trailing slash
		if (route) {
			// if `paths.base === '/a/b/c`, then the root route is `/a/b/c/`,
			// regardless of the `trailingSlash` route option
			if (url.pathname === base || url.pathname === base + '/') {
				trailing_slash = 'always';
			} else if (page_nodes) {
				if (DEV) {
					page_nodes.validate();
				}
				trailing_slash = page_nodes.trailing_slash();
			} else if (route.endpoint) {
				const node = await route.endpoint();
				trailing_slash = node.trailingSlash ?? 'never';
				if (DEV) {
					validate_server_exports(node, /** @type {string} */ (route.endpoint_id));
				}
			}

			if (!is_data_request) {
				const normalized = normalize_path(url.pathname, trailing_slash);

				if (normalized !== url.pathname) {
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

			if (state.before_handle) {
				let config = {};

				/** @type {import('types').PrerenderOption} */
				let prerender = false;

				if (route.endpoint) {
					const node = await route.endpoint();
					config = node.config ?? config;
				} else if (page_nodes) {
					config = page_nodes.get_config() ?? config;
					prerender = page_nodes.prerender();
				}

				if (state.before_handle) {
					state.before_handle(event, config, prerender);
				}
			}
		}

		set_trailing_slash(trailing_slash);

		const response = await resolve(event, page_nodes).then((response) => {
			// add headers/cookies here, rather than inside `resolve`, so that we
			// can do it once for all responses instead of once per `return`
			for (const key in headers) {
				const value = headers[key];
				response.headers.set(key, /** @type {string} */ (value));
			}

			add_cookies_to_headers(response.headers, Object.values(new_cookies));

			return response;
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
			add_cookies_to_headers(response.headers, Object.values(new_cookies));
			return response;
		}
		return await handle_fatal_error(event, options, e);
	}

	/**
	 * @param {import('types').SWRequestEvent} event
	 * @param {PageNodes | undefined} page_nodes
	 * @param {import('@sveltejs/kit').ResolveOptions} [opts]
	 */
	async function resolve(event, page_nodes, opts) {
		try {
			if (opts) {
				resolve_opts = {
					transformPageChunk: opts.transformPageChunk || default_transform,
					filterSerializedResponseHeaders: opts.filterSerializedResponseHeaders || default_filter,
					preload: opts.preload || default_preload
				};
			}

			if (options.hash_routing) {
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
				const method = /** @type {import('types').HttpMethod} */ (event.request.method);

				/** @type {Response} */
				let response;

				if (is_data_request) {
					response = await render_data(
						event,
						route,
						options,
						invalidated_data_nodes,
						trailing_slash
					);
				} else if (route.endpoint && (!route.page || is_endpoint_request(event))) {
					// We can't handle an endpoint request in a service worker, so we need to
					response = await fetch(event.request);
				} else if (route.page) {
					if (!page_nodes) {
						throw new Error('page_nodes not found. This should never happen');
					} else if (page_methods.has(method)) {
						response = await render_page(
							event,
							route.page,
							options,
							manifest,
							state,
							page_nodes,
							resolve_opts
						);
					} else {
						const allowed_methods = new Set(allowed_page_methods);
						const node = await manifest.nodes[route.page.leaf]();
						if (node?.server?.actions) {
							allowed_methods.add('POST');
						}

						if (method === 'OPTIONS') {
							// This will deny CORS preflight requests implicitly because we don't
							// add the required CORS headers to the response.
							response = new Response(null, {
								status: 204,
								headers: {
									allow: Array.from(allowed_methods.values()).join(', ')
								}
							});
						} else {
							const mod = [...allowed_methods].reduce((acc, curr) => {
								acc[curr] = true;
								return acc;
							}, /** @type {Record<string, any>} */ ({}));
							response = method_not_allowed(mod, method);
						}
					}
				} else {
					// a route will always have a page or an endpoint, but TypeScript doesn't know that
					throw new Error('Route is neither page nor endpoint. This should never happen');
				}

				// If the route contains a page and an endpoint, we need to add a
				// `Vary: Accept` header to the response because of browser caching
				if (request.method === 'GET' && route.page && route.endpoint) {
					const vary = response.headers
						.get('vary')
						?.split(',')
						?.map((v) => v.trim().toLowerCase());
					if (!(vary?.includes('accept') || vary?.includes('*'))) {
						// the returned response might have immutable headers,
						// so we have to clone them before trying to mutate them
						response = new Response(response.body, {
							status: response.status,
							statusText: response.statusText,
							headers: new Headers(response.headers)
						});
						response.headers.append('Vary', 'Accept');
					}
				}

				return response;
			}

			if (state.error && event.isSubRequest) {
				// avoid overwriting the headers. This could be a same origin fetch request
				// to an external service from the root layout while rendering an error page
				const headers = new Headers(request.headers);
				headers.set('x-sveltekit-error', 'true');
				return await fetch(request, { headers });
			}

			if (state.error) {
				return text('Internal Server Error', {
					status: 500
				});
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

/**
 * @param {import('types').PageNodeIndexes} page
 * @param {import('types').SWRManifest} manifest
 */
export function load_page_nodes(page, manifest) {
	return Promise.all([
		// we use == here rather than === because [undefined] serializes as "[null]"
		...page.layouts.map((n) => (n == undefined ? n : manifest.nodes[n]())),
		manifest.nodes[page.leaf]()
	]);
}
