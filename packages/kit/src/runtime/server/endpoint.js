/**
 * @param {import('types').Request} request
 * @param {import('types.internal').SSREndpoint} route
 * @returns {Promise<import('types').Response>}
 */
export default async function render_route(request, route) {
	const mod = await route.load();

	/** @type {import('types').RequestHandler} */
	const handler = mod[request.method.toLowerCase().replace('delete', 'del')]; // 'delete' is a reserved word

	if (handler) {
		const match = route.pattern.exec(request.path);
		const params = route.params(match);

		const response = await handler({ ...request, params });

		if (response) {
			if (typeof response !== 'object' || response.body == null) {
				return {
					status: 500,
					body: `Invalid response from route ${request.path}; ${
						response.body == null ? 'body is missing' : `expected an object, got ${typeof response}`
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

/** @param {Record<string, string>} obj */
function lowercase_keys(obj) {
	/** @type {Record<string, string>} */
	const clone = {};

	for (const key in obj) {
		clone[key.toLowerCase()] = obj[key];
	}

	return clone;
}
