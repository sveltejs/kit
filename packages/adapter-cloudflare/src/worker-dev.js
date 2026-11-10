// renders sveltekit in workerd during dev, for the custom worker that imports it or as a worker of
// its own
import { server } from '@sveltejs/kit/dev-server';

/**
 * @param {Request} request
 * @param {any} env
 * @returns {Promise<Response>}
 */
export async function fetch(request, env) {
	await server.init({ env });

	return server.respond(request, {
		getClientAddress: () => request.headers.get('cf-connecting-ip') ?? '127.0.0.1'
	});
}

export default { fetch };
