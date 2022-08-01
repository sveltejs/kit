import { check_method_names } from './utils.js';

/**
 * @param {import('types').RequestEvent} event
 * @param {{ [method: string]: import('types').RequestHandler }} mod
 * @returns {Promise<Response>}
 */
export async function render_endpoint(event, mod) {
	const { method } = event.request;

	check_method_names(mod);

	/** @type {import('types').RequestHandler} */
	let handler = mod[method];

	if (!handler && method === 'HEAD') {
		handler = mod.GET;
	}

	if (!handler) {
		const allowed = [];

		for (const method in ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
			if (mod[method]) allowed.push(method);
		}

		if (mod.GET || mod.HEAD) allowed.push('HEAD');

		return event.request.headers.get('x-sveltekit-load')
			? // TODO would be nice to avoid these requests altogether,
			  // by noting whether or not page endpoints export `get`
			  new Response(undefined, {
					status: 204
			  })
			: new Response(`${method} method not allowed`, {
					status: 405,
					headers: {
						// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
						// "The server must generate an Allow header field in a 405 status code response"
						allow: allowed.join(', ')
					}
			  });
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
