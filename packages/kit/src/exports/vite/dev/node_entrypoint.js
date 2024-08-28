import { Server } from '../../../runtime/server/index.js';

const environment_context = await import('__sveltekit/environment_context');

export default {
	fetch: /** @param {Request} request **/ async (request) => {
		const server = new Server(environment_context.manifest);

		await server.init({
			env: environment_context.env
		});

		return server.respond(request, {
			getClientAddress: () => {
				if (environment_context.remote_address) return environment_context.remote_address;

				throw new Error('Could not determine clientAddress');
			}
		});
	}
};
