import { Headers } from '../app/headers.js';

/**
 * @param {import('../../../types.internal').Request} request
 * @param {*} context // TODO
 * @param {import('../../../types.internal').SSRRenderOptions} options
 * @returns {Promise<import('../../../types.internal').Response>}
 */
export default function render_route(request, context, options) {
	const route = options.manifest.endpoints.find((route) => route.pattern.test(request.path));
	if (!route) return null;

	return route.load().then(async (mod) => {
		/** @type {import('../../../types').RequestHandler} */
		const handler = mod[request.method.toLowerCase().replace('delete', 'del')]; // 'delete' is a reserved word

		if (handler) {
			const match = route.pattern.exec(request.path);
			const params = route.params(match);

			const response = await handler(
				{
					host: options.host || request.headers.get(options.host_header || 'host'),
					path: request.path,
					headers: request.headers,
					query: request.query,
					body: request.body,
					params
				},
				context
			);

			if (typeof response !== 'object' || response.body == null) {
				return {
					status: 500,
					body: `Invalid response from route ${request.path}; ${
						response.body == null ? 'body is missing' : `expected an object, got ${typeof response}`
					}`,
					headers: new Headers()
				};
			}

			let { status = 200, body, headers = new Headers() } = response;

			if (
				(typeof body === 'object' && !('content-type' in headers)) ||
				headers.get('content-type') === 'application/json'
			) {
				headers.set('content-type', 'application/json');
				body = JSON.stringify(body);
			}

			return { status, body, headers };
		} else {
			return {
				status: 501,
				body: `${request.method} is not implemented for ${request.path}`,
				headers: new Headers()
			};
		}
	});
}
