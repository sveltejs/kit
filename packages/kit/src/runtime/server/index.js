import render_page from './page/index.js';
import render_endpoint from './endpoint.js';
import { parse_body } from './parse_body/index.js';

/**
 * @param {import('types/hooks').Incoming} incoming
 * @param {import('types/internal').SSRRenderOptions} options
 * @param {import('types/internal').SSRRenderState} [state]
 */
export async function ssr(incoming, options, state = {}) {
	if (incoming.path.endsWith('/') && incoming.path !== '/') {
		const q = incoming.query.toString();

		return {
			status: 301,
			headers: {
				location: incoming.path.slice(0, -1) + (q ? `?${q}` : '')
			}
		};
	}

	const incoming_with_body = {
		...incoming,
		body: parse_body(incoming)
	};

	const context = (await options.hooks.getContext(incoming_with_body)) || {};

	try {
		return await options.hooks.handle({
			request: {
				...incoming_with_body,
				params: null,
				context
			},
			render: async (request) => {
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
								const etag = `"${hash(response.body)}"`;

								if (request.headers['if-none-match'] === etag) {
									return {
										status: 304,
										headers: {},
										body: null
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
	} catch (e) {
		options.handle_error(e);

		return {
			status: 500,
			headers: {},
			body: options.dev ? e.stack : e.message
		};
	}
}

/** @param {string} str */
export function hash(str) {
	let hash = 5381,
		i = str.length;
	while (i) hash = (hash * 33) ^ str.charCodeAt(--i);
	return (hash >>> 0).toString(36);
}
