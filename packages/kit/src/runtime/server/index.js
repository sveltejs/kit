import { render_endpoint } from './endpoint.js';
import { render_page } from './page/index.js';
import { render_response } from './page/render.js';
import { respond_with_error } from './page/respond_with_error.js';
import { hash } from '../hash.js';
import { get_single_valued_header } from '../../utils/http.js';
import { coalesce_to_error } from '../../utils/error.js';

/** @type {import('types/internal').Respond} */
export async function respond(request, options, state = {}) {
	const url = new URL(request.url);

	if (url.pathname !== '/' && options.trailing_slash !== 'ignore') {
		const has_trailing_slash = url.pathname.endsWith('/');

		if (
			(has_trailing_slash && options.trailing_slash === 'never') ||
			(!has_trailing_slash &&
				options.trailing_slash === 'always' &&
				!(url.pathname.split('/').pop() || '').includes('.'))
		) {
			url.pathname = has_trailing_slash ? url.pathname.slice(0, -1) : url.pathname + '/';

			if (url.search === '?') url.search = '';

			return {
				status: 301,
				headers: {
					location: url.pathname + url.search
				}
			};
		}
	}

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
				const body = `${parameter}=${method_override} is not ${verb}. See https://kit.svelte.dev/docs#configuration-methodoverride`;

				return {
					status: 400,
					headers: {},
					body
				};
			}
		} else {
			throw new Error(`${parameter}=${method_override} is only allowed with POST requests`);
		}
	}

	/** @type {import('types/hooks').RequestEvent} */
	const event = {
		request,
		url,
		params: {},
		locals: {}
	};

	// TODO remove this for 1.0
	/**
	 * @param {string} property
	 * @param {string} replacement
	 */
	const removed = (property, replacement) => ({
		get: () => {
			throw new Error(`event.${property} has been replaced by event.${replacement}`);
		}
	});

	const body_getter = {
		get: () => {
			throw new Error(
				'To access the request body use the text/json/arrayBuffer/formData methods, e.g. `body = await request.json()`'
			);
		}
	};

	Object.defineProperties(event, {
		method: removed('method', 'request.method'),
		headers: removed('headers', 'request.headers'),
		origin: removed('origin', 'url.origin'),
		path: removed('path', 'url.pathname'),
		query: removed('query', 'url.searchParams'),
		body: body_getter,
		rawBody: body_getter
	});

	let ssr = true;

	try {
		return await options.hooks.handle({
			event,
			resolve: async (event, opts) => {
				if (opts && 'ssr' in opts) ssr = /** @type {boolean} */ (opts.ssr);

				if (state.prerender && state.prerender.fallback) {
					return await render_response({
						url: event.url,
						params: event.params,
						options,
						state,
						$session: await options.hooks.getSession(event),
						page_config: { router: true, hydrate: true },
						stuff: {},
						status: 200,
						branch: [],
						ssr: false
					});
				}

				let decoded = decodeURI(event.url.pathname);

				if (options.paths.base) {
					if (!decoded.startsWith(options.paths.base)) return;
					decoded = decoded.slice(options.paths.base.length) || '/';
				}

				for (const route of options.manifest._.routes) {
					const match = route.pattern.exec(decoded);
					if (!match) continue;

					const response =
						route.type === 'endpoint'
							? await render_endpoint(event, route, match)
							: await render_page(event, route, match, options, state, ssr);

					if (response) {
						// inject ETags for 200 responses, if the endpoint
						// doesn't have its own ETag handling
						if (response.status === 200 && !response.headers.etag) {
							const cache_control = get_single_valued_header(response.headers, 'cache-control');
							if (!cache_control || !/(no-store|immutable)/.test(cache_control)) {
								let if_none_match_value = request.headers.get('if-none-match');
								// ignore W/ prefix https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-None-Match#directives
								if (if_none_match_value?.startsWith('W/"')) {
									if_none_match_value = if_none_match_value.substring(2);
								}

								const etag = `"${hash(response.body || '')}"`;

								if (if_none_match_value === etag) {
									/** @type {import('types/helper').ResponseHeaders} */
									const headers = { etag };

									// https://datatracker.ietf.org/doc/html/rfc7232#section-4.1
									for (const key of [
										'cache-control',
										'content-location',
										'date',
										'expires',
										'vary'
									]) {
										if (key in response.headers) {
											headers[key] = /** @type {string} */ (response.headers[key]);
										}
									}

									return {
										status: 304,
										headers
									};
								}

								response.headers['etag'] = etag;
							}
						}

						return response;
					}
				}

				// if this request came direct from the user, rather than
				// via a `fetch` in a `load`, render a 404 page
				if (!state.initiator) {
					const $session = await options.hooks.getSession(event);
					return await respond_with_error({
						event,
						options,
						state,
						$session,
						status: 404,
						error: new Error(`Not found: ${event.url.pathname}`),
						ssr
					});
				}
			},

			// TODO remove for 1.0
			// @ts-expect-error
			get request() {
				throw new Error('request in handle has been replaced with event');
			}
		});
	} catch (/** @type {unknown} */ e) {
		const error = coalesce_to_error(e);

		options.handle_error(error, event);

		try {
			const $session = await options.hooks.getSession(event);
			return await respond_with_error({
				event,
				options,
				state,
				$session,
				status: 500,
				error,
				ssr
			});
		} catch (/** @type {unknown} */ e) {
			const error = coalesce_to_error(e);

			return {
				status: 500,
				headers: {},
				body: options.dev ? error.stack : error.message
			};
		}
	}
}
