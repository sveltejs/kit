import { render_endpoint } from './endpoint.js';
import { render_page } from './page/index.js';
import { render_response } from './page/render.js';
import { respond_with_error } from './page/respond_with_error.js';
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

			return new Response(undefined, {
				status: 301,
				headers: {
					location: url.pathname + url.search
				}
			});
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

	let ssr = true;

	try {
		const response = await options.hooks.handle({
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
					if (!decoded.startsWith(options.paths.base)) {
						return new Response(undefined, { status: 404 });
					}
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
						ssr
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
				ssr
			});
		} catch (/** @type {unknown} */ e) {
			const error = coalesce_to_error(e);

			return new Response(options.dev ? error.stack : error.message, {
				status: 500
			});
		}
	}
}
