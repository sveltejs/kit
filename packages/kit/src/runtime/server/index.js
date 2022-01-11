import { render_endpoint } from './endpoint.js';
import { render_page } from './page/index.js';
import { render_response } from './page/render.js';
import { respond_with_error } from './page/respond_with_error.js';
import { parse_body } from './parse_body/index.js';
import { lowercase_keys } from './utils.js';
import { hash } from '../hash.js';
import { get_single_valued_header } from '../../utils/http.js';
import { coalesce_to_error } from '../../utils/error.js';

/** @type {import('@sveltejs/kit/ssr').Respond} */
export async function respond(incoming, options, state = {}) {
	if (incoming.url.pathname !== '/' && options.trailing_slash !== 'ignore') {
		const has_trailing_slash = incoming.url.pathname.endsWith('/');

		if (
			(has_trailing_slash && options.trailing_slash === 'never') ||
			(!has_trailing_slash &&
				options.trailing_slash === 'always' &&
				!(incoming.url.pathname.split('/').pop() || '').includes('.'))
		) {
			incoming.url.pathname = has_trailing_slash
				? incoming.url.pathname.slice(0, -1)
				: incoming.url.pathname + '/';

			if (incoming.url.search === '?') incoming.url.search = '';

			return {
				status: 301,
				headers: {
					location: incoming.url.pathname + incoming.url.search
				}
			};
		}
	}

	const headers = lowercase_keys(incoming.headers);
	const request = {
		...incoming,
		headers,
		body: parse_body(incoming.rawBody, headers),
		params: {},
		locals: {}
	};

	// TODO remove this for 1.0
	/**
	 * @param {string} property
	 * @param {string} replacement
	 */
	const print_error = (property, replacement) => {
		Object.defineProperty(request, property, {
			get: () => {
				throw new Error(`request.${property} has been replaced by request.url.${replacement}`);
			}
		});
	};

	print_error('origin', 'origin');
	print_error('path', 'pathname');
	print_error('query', 'searchParams');

	let ssr = true;

	try {
		return await options.hooks.handle({
			request,
			resolve: async (request, opts) => {
				if (opts && 'ssr' in opts) ssr = /** @type {boolean} */ (opts.ssr);

				if (state.prerender && state.prerender.fallback) {
					return await render_response({
						url: request.url,
						params: request.params,
						options,
						$session: await options.hooks.getSession(request),
						page_config: { router: true, hydrate: true },
						stuff: {},
						status: 200,
						branch: [],
						ssr: false
					});
				}

				const decoded = decodeURI(request.url.pathname).replace(options.paths.base, '');

				for (const route of options.manifest._.routes) {
					const match = route.pattern.exec(decoded);
					if (!match) continue;

					const response =
						route.type === 'endpoint'
							? await render_endpoint(request, route, match)
							: await render_page(request, route, match, options, state, ssr);

					if (response) {
						// inject ETags for 200 responses
						if (response.status === 200) {
							const cache_control = get_single_valued_header(response.headers, 'cache-control');
							if (!cache_control || !/(no-store|immutable)/.test(cache_control)) {
								let if_none_match_value = request.headers['if-none-match'];
								// ignore W/ prefix https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-None-Match#directives
								if (if_none_match_value?.startsWith('W/"')) {
									if_none_match_value = if_none_match_value.substring(2);
								}

								const etag = `"${hash(response.body || '')}"`;

								if (if_none_match_value === etag) {
									return {
										status: 304,
										headers: {}
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
					const $session = await options.hooks.getSession(request);
					return await respond_with_error({
						request,
						options,
						state,
						$session,
						status: 404,
						error: new Error(`Not found: ${request.url.pathname}`),
						ssr
					});
				}
			}
		});
	} catch (/** @type {unknown} */ e) {
		const error = coalesce_to_error(e);

		options.handle_error(error, request);

		try {
			const $session = await options.hooks.getSession(request);
			return await respond_with_error({
				request,
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
