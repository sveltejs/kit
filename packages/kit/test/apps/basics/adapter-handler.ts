import type { SSRHandler } from '@sveltejs/kit';

/**
 * Custom handler for the test adapter. Intercepts requests to
 * `/adapter/custom-handler/intercepted` and adds a header to responses
 * for every other route beneath `/adapter/custom-handler`.
 */
const handler: SSRHandler = async (server) => {
	return async (request) => {
		const { pathname } = new URL(request.url);

		if (pathname === '/adapter/custom-handler/intercepted') {
			return new Response('intercepted by the adapter', {
				headers: { 'content-type': 'text/plain' }
			});
		}

		const response = await server.respond(request);

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
};

export default handler;
