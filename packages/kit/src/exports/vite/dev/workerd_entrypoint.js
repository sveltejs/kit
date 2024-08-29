import { Server } from '../../../runtime/server/index.js';

export default {
	/**
	 * @param {Request & { cf: any }} req
	 * @param {any} env
	 * @param {any} ctx
	 */
	fetch: async (req, env, ctx) => {
		const environment_context = await import('__sveltekit/environment_context');
		const server = new Server(environment_context.manifest);

		await server.init({
			env: environment_context.env
		});

		return server.respond(req, {
			getClientAddress: () => {
				if (!environment_context.remote_address) {
					throw new Error('Could not determine clientAddress');
				}

				return environment_context.remote_address;
			},
			platform: {
				env,
				cf: req.cf,
				ctx,
				caches
			}
		});
	}
};
