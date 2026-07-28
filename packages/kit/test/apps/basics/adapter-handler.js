/** @import { SSRHandler } from '@sveltejs/kit' */
import { createReadableStream } from '@sveltejs/kit/node';

/**
 * Custom handler for the test adapter. Intercepts requests to
 * `/adapter/custom-handler/intercepted` and adds a header to responses
 * for every other route beneath `/adapter/custom-handler`.
 * @type {SSRHandler}
 */
export default async function handler(server, env) {
	await server.init({ env, read: (file) => createReadableStream(file) });

	return async (request, options) => {
		const { pathname } = new URL(request.url);

		if (pathname === '/adapter/custom-handler/intercepted') {
			return new Response('intercepted by the adapter', {
				headers: { 'content-type': 'text/plain' }
			});
		}

		const response = await server.respond(request, options);

		if (pathname.startsWith('/adapter/custom-handler')) {
			const headers = new Headers(response.headers);
			headers.set('x-adapter-custom-handler', 'true');

			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers
			});
		}

		return response;
	};
}
