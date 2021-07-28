import render_page from './page/index.js';
import { render_response } from './page/render.js';
import render_endpoint from './endpoint.js';
import { parse_body } from './parse_body/index.js';
import { coalesce_to_error, lowercase_keys } from './utils.js';
import { hash } from '../hash.js';

/**
 * @param {import('types/internal').Incoming} incoming
 * @param {import('types/internal').SSRRenderOptions} options
 * @param {import('types/internal').SSRRenderState} [state]
 */
export async function respond(incoming, options, state = {}) {
	if (incoming.path !== '/' && options.trailing_slash !== 'ignore') {
		const has_trailing_slash = incoming.path.endsWith('/');

		if (
			(has_trailing_slash && options.trailing_slash === 'never') ||
			(!has_trailing_slash &&
				options.trailing_slash === 'always' &&
				!(incoming.path.split('/').pop() || '').includes('.'))
		) {
			const path = has_trailing_slash ? incoming.path.slice(0, -1) : incoming.path + '/';
			const q = incoming.query.toString();

			return {
				status: 301,
				headers: {
					location: encodeURI(path + (q ? `?${q}` : ''))
				}
			};
		}
	}

	try {
		const headers = lowercase_keys(incoming.headers);

		return await options.hooks.handle({
			request: {
				...incoming,
				headers,
				body: parse_body(incoming.rawBody, headers),
				params: {},
				locals: {}
			},
			resolve: async (request) => {
				if (state.prerender && state.prerender.fallback) {
					return await render_response({
						options,
						$session: await options.hooks.getSession(request),
						page_config: { ssr: false, router: true, hydrate: true, prerender: true },
						status: 200,
						branch: []
					});
				}

				for (const route of options.manifest.routes) {
					if (!route.pattern.test(request.path)) continue;

					const response =
						route.type === 'endpoint'
							? await render_endpoint(request, route)
							: await render_page(request, route, options, state);

					if (response) {
						// inject ETags for 200 responses
						if (response.status === 200) {
							if (!/(no-store|immutable)/.test(response.headers['cache-control'])) {
								const etag = `"${hash(response.body || '')}"`;

								if (request.headers['if-none-match'] === etag) {
									return {
										status: 304,
										headers: {},
										body: ''
									};
								}

								response.headers['etag'] = etag;
							}
						}

						return response;
					}
				}

				return await render_page(request, null, options, state);
			}
		});
	} catch (/** @type {unknown} */ err) {
		const e = coalesce_to_error(err);

		options.handle_error(e);

		return {
			status: 500,
			headers: {},
			body: options.dev ? e.stack : e.message
		};
	}
}
