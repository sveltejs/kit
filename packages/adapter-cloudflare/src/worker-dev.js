// the worker that renders sveltekit in workerd during dev
import { server } from '@sveltejs/kit/dev-server';

export default {
	/**
	 * @param {Request} request
	 * @param {any} env
	 * @returns {Promise<Response>}
	 */
	async fetch(request, env) {
		await server.init({ env });

		return server.respond(request, {
			getClientAddress: () => request.headers.get('cf-connecting-ip') ?? '127.0.0.1'
		});
	}
};
