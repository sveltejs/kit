// This should be exported from @sveltejs/kit so that the path isn't relative
import { Server } from '../../../runtime/server/index.js';

export default {
	/**
	 * This fetch handler is the entrypoint for the environment.
	 * @param {Request & { cf: any }} request
	 * @param {any} env
	 * @param {any} context
	 */
	fetch: async (request, env, context) => {
		const environment_context = await import('__sveltekit/environment_context');
		const server = new Server(environment_context.manifest);

		await server.init({
			env: environment_context.env
		});

		return server.respond(request, {
			getClientAddress: () => {
				if (environment_context.remote_address) return environment_context.remote_address;
				throw new Error('Could not determine clientAddress');
			},
			// We can provide the platform properties directly as the code is executed in a workerd environment.
			platform: {
				env,
				cf: request.cf,
				context,
				caches
			}
		});
	}
};
