/**
 * @param {import('../../../types.internal').Request} request
 * @param {*} context // TODO
 * @param {import('../../../types.internal').SSRRenderOptions} options
 * @returns {Promise<import('../../../types.internal').SKResponse>}
 */
export default async function render_route(request, context, options) {
	const route = options.manifest.endpoints.find((route) => route.pattern.test(request.path));
	if (!route) return null;

	// see if this endpoint falls through to another
	const pattern = route.pattern.toString();
	const routes = options.manifest.endpoints.filter((route) => route.pattern.toString() === pattern);

	for (const route of routes) {
		const mod = await route.load();

		/** @type {import('../../../types').RequestHandler} */
		const handler = mod[request.method.toLowerCase().replace('delete', 'del')]; // 'delete' is a reserved word

		if (handler) {
			const match = route.pattern.exec(request.path);
			const params = route.params(match);

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

			if (response) {
				if (typeof response !== 'object' || response.body == null) {
					return {
						status: 500,
						body: `Invalid response from route ${request.path}; ${
							response.body == null
								? 'body is missing'
								: `expected an object, got ${typeof response}`
						}`,
						headers: {}
					};
				}

				let { status = 200, body, headers = {} } = response;

				headers = lowercase_keys(headers);

				if (
					(typeof body === 'object' && !('content-type' in headers)) ||
					headers['content-type'] === 'application/json'
				) {
					headers = { ...headers, 'content-type': 'application/json' };
					body = JSON.stringify(body);
				}

				return { status, body, headers };
			}
		}
	}
}

/** @param {Record<string, string>} obj */
function lowercase_keys(obj) {
	/** @type {Record<string, string>} */
	const clone = {};

	for (const key in obj) {
		clone[key.toLowerCase()] = obj[key];
	}

	return clone;
}
