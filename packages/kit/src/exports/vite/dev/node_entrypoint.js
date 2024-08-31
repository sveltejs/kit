import { Server } from '@sveltejs/kit';

export default {
	/**
	 * @param {Request} request
	 */
	fetch: async (request) => {
		const environment_context = await import('__sveltekit/environment_context');
		const server = new Server(environment_context.manifest);

		await server.init({
			env: environment_context.env
		});

		return server.respond(request, {
			getClientAddress: () => {
				if (!environment_context.remote_address) {
					throw new Error('Could not determine clientAddress');
				}

				return environment_context.remote_address;
			}
		});
	}
};
