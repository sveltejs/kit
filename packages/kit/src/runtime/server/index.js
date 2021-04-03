import { createHash } from 'crypto';
import render_page from './page/index.js';
import render_endpoint from './endpoint.js';

/** @param {string} body */
function md5(body) {
	return createHash('md5').update(body).digest('hex');
}

/**
 * @param {import('../../../types').Incoming} incoming
 * @param {import('../../../types.internal').SSRRenderOptions} options
 */
export async function ssr(incoming, options) {
	if (incoming.path.endsWith('/') && incoming.path !== '/') {
		const q = incoming.query.toString();

		return {
			status: 301,
			headers: {
				location: incoming.path.slice(0, -1) + (q ? `?${q}` : '')
			}
		};
	}

	const context = (await options.hooks.getContext(incoming)) || {};

	try {
		return await options.hooks.handle(
			{
				...incoming,
				params: null,
				context
			},
			async (request) => {
				for (const route of options.manifest.routes) {
					if (!route.pattern.test(request.path)) continue;

					const response =
						route.type === 'endpoint'
							? await render_endpoint(request, route)
							: await render_page(request, route, options);

					if (response) {
						// inject ETags for 200 responses
						if (response.status === 200) {
							if (!/(no-store|immutable)/.test(response.headers['cache-control'])) {
								const etag = `"${md5(response.body)}"`;

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

				return await render_page(request, null, options);
			}
		);
	} catch (e) {
		if (e && e.stack) {
			e.stack = await options.get_stack(e);
		}

		console.error((e && e.stack) || e);

		return {
			status: 500,
			headers: {},
			body: options.dev ? e.stack : e.message
		};
	}
}
