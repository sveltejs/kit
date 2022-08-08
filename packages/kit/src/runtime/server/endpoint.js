import { check_method_names, method_not_allowed } from './utils.js';

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSREndpoint} route
 * @returns {Promise<Response>}
 */
export async function render_endpoint(event, route) {
	const method = /** @type {import('types').HttpMethod} */ (event.request.method);

	const mod = await route.load();

	// TODO: Remove for 1.0
	check_method_names(mod);

	let handler = mod[method];

	if (!handler && method === 'HEAD') {
		handler = mod.GET;
	}

	if (!handler) {
		if (event.request.headers.get('x-sveltekit-load')) {
			// TODO would be nice to avoid these requests altogether,
			// by noting whether or not page endpoints export `get`
			return new Response(undefined, { status: 204 });
		}

		return method_not_allowed(mod, method);
	}

	const response = await handler(event);

	if (!(response instanceof Response)) {
		return new Response(
			`Invalid response from route ${event.url.pathname}: handler should return a Response object`,
			{ status: 500 }
		);
	}

	return response;
}
