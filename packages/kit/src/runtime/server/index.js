import { render_endpoint } from './endpoint.js';
import { render_page } from './page/index.js';
import { render_response } from './page/render.js';
import { respond_with_error } from './page/respond_with_error.js';
import { coalesce_to_error } from '../../utils/error.js';
import { decode_params } from './utils.js';
import { normalize_path } from '../../utils/url.js';

const DATA_SUFFIX = '/__data.json';

/** @param {{ html: string }} opts */
const default_transform = ({ html }) => html;

/** @type {import('types/internal').Respond} */
export async function respond(request, options, state = {}) {
	const url = new URL(request.url);

	const normalized = normalize_path(url.pathname, options.trailing_slash);

	if (normalized !== url.pathname) {
		return new Response(undefined, {
			status: 301,
			headers: {
				location: normalized + (url.search === '?' ? '' : url.search)
			}
		});
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
				const body = `${parameter}=${method_override} is not ${verb}. See https://kit.svelte.dev/docs/configuration#methodoverride`;

				return new Response(body, {
					status: 400
				});
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
		// @ts-expect-error this picks up types that belong to the tests
		locals: {},
		platform: state.platform
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

	/** @type {import('types/hooks').RequiredResolveOptions} */
	let resolve_opts = {
		ssr: true,
		transformPage: default_transform
	};

	try {
		const response = await options.hooks.handle({
			event,
			resolve: async (event, opts) => {
				if (opts) {
					resolve_opts = {
						ssr: opts.ssr !== false,
						transformPage: opts.transformPage || default_transform
					};
				}

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
						resolve_opts: {
							...resolve_opts,
							ssr: false
						}
					});
				}

				let decoded = decodeURI(event.url.pathname);

				if (options.paths.base) {
					if (!decoded.startsWith(options.paths.base)) {
						return new Response(undefined, { status: 404 });
					}
					decoded = decoded.slice(options.paths.base.length) || '/';
				}

				const is_data_request = decoded.endsWith(DATA_SUFFIX);

				if (is_data_request) {
					decoded = decoded.slice(0, -DATA_SUFFIX.length) || '/';

					const normalized = normalize_path(
						url.pathname.slice(0, -DATA_SUFFIX.length),
						options.trailing_slash
					);

					event.url = new URL(event.url.origin + normalized + event.url.search);
				}

				for (const route of options.manifest._.routes) {
					const match = route.pattern.exec(decoded);
					if (!match) continue;

					event.params = route.params ? decode_params(route.params(match)) : {};

					/** @type {Response | undefined} */
					let response;

					if (is_data_request && route.type === 'page' && route.shadow) {
						response = await render_endpoint(event, await route.shadow());

						// loading data for a client-side transition is a special case
						if (request.headers.get('x-sveltekit-load') === 'true') {
							if (response) {
								// since redirects are opaque to the browser, we need to repackage
								// 3xx responses as 200s with a custom header
								if (response.status >= 300 && response.status < 400) {
									const location = response.headers.get('location');

									if (location) {
										const headers = new Headers(response.headers);
										headers.set('x-sveltekit-location', location);
										response = new Response(undefined, {
											status: 204,
											headers
										});
									}
								}
							} else {
								// TODO ideally, the client wouldn't request this data
								// in the first place (at least in production)
								response = new Response('{}', {
									headers: {
										'content-type': 'application/json'
									}
								});
							}
						}
					} else {
						response =
							route.type === 'endpoint'
								? await render_endpoint(event, await route.load())
								: await render_page(event, route, options, state, resolve_opts);
					}

					if (response) {
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
								for (const key of [
									'cache-control',
									'content-location',
									'date',
									'expires',
									'vary'
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
						resolve_opts
					});
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

		try {
			const $session = await options.hooks.getSession(event);
			return await respond_with_error({
				event,
				options,
				state,
				$session,
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
