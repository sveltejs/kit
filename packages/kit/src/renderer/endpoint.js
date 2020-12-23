import { normalize_headers } from './utils';

export default function render_route(request, context, options) {
	const route = options.manifest.endpoints.find((route) => route.pattern.test(request.path));
	if (!route) return null;

	return route.load().then(async (mod) => {
		// TODO make method override (?_method=delete) configurable
		const method = (request.query.get('_method') || request.method).toLowerCase();

		const handler = mod[method.replace('delete', 'del')]; // 'delete' is a reserved word

		if (handler) {
			const match = route.pattern.exec(request.path);
			const params = route.params(match);

			try {
				const response = await handler(
					{
						host: options.host || request.headers[options.host_header || 'host'],
						path: request.path,
						headers: request.headers,
						query: request.query,
						body: request.body,
						params
					},
					context
				);

				if (method === 'get' && (typeof response !== 'object' || response.body == null)) {
					return {
						status: 500,
						body: `Invalid response from route ${request.path}; ${
							response && response.body == null
								? 'body is missing'
								: `expected an object, got ${typeof response}`
						}`,
						headers: {}
					};
				}

				let { status = 200, body, headers = {} } = response || {};

				headers = normalize_headers(headers);

				if (
					(typeof body === 'object' && !('content-type' in headers)) ||
					headers['content-type'] === 'application/json'
				) {
					headers = { ...headers, 'content-type': 'application/json' };
					body = JSON.stringify(body);
				}

				return { status, body, headers };
			} catch (err) {
				return {
					status: 500,
					body: err.message,
					headers: {}
				};
			}
		} else {
			return {
				status: 501,
				body: `${request.method} is not implemented for ${request.path}`,
				headers: {}
			};
		}
	});
}
