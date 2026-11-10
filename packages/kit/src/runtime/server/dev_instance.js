/** @import { Server, ServerInitOptions } from '@sveltejs/kit' */
import { assets, instrumentation, manifest } from '<sveltekit:generated>/server-manifest.js';

// the runtime reports the features requests use in dev, which are not checked here
globalThis.__SVELTEKIT_TRACK__ = () => {};

/** @type {ServerInitOptions | undefined} */
let options;

/** @type {Server} */
export const server = {
	init(opts) {
		options = opts;
		return Promise.resolve();
	},

	async respond(request, request_options) {
		const env = options?.env ?? {};

		if (instrumentation) {
			// the instrumentation file may read environment variables, so set them first
			const { set_env } = await import('<sveltekit:generated>/env/config.js');
			set_env(env);
			await instrumentation();
		}

		const { configure } = await import('./index.js');

		// configures the runtime for each request, like the node dev server
		const server = await configure({
			manifest,
			env,
			assets,
			read: options?.read
		});
		await server.init();

		// without read, like in production, since it is only for prerendering static files
		return server.respond(
			request,
			/** @type {import('types').InternalRequestOptions} */ (request_options)
		);
	}
};
