import { configure as set_state } from '<sveltekit:generated>/server.js';

/**
 * Sets the module-level state the runtime reads, then loads the runtime. Everything that
 * evaluates user code, the env config included, sits behind this import
 * @param {import('types').ServerConfigureOptions} opts
 * @returns {Promise<import('types').ServerInstance>}
 */
export async function configure(opts) {
	set_state(opts);

	const instance = await import('./instance.js');
	if (opts.env) instance.set_env(opts.env);

	return instance;
}

/**
 * The `server` object adapters receive from `builder.generateServerInstance`
 * @param {import('types').SSRManifest} manifest
 * @returns {import('@sveltejs/kit').Server}
 */
export function create_server(manifest) {
	/** @type {import('types').ServerInstance} */
	let server;

	return {
		// adapters get to set `env` and `read`, nothing else
		init: async ({ env, read }) => {
			server = await configure({ manifest, env, read });
			await server.init();
		},
		/** @type {import('types').ServerInstance['respond']} */
		respond: (request, options) => server.respond(request, options)
	};
}

/** @deprecated use the `server` written by `builder.generateServerInstance`, or `configure` */
export class Server {
	#server;

	/** @param {import('types').SSRManifest} manifest */
	constructor(manifest) {
		this.#server = create_server(manifest);
	}

	/** @param {import('@sveltejs/kit').ServerInitOptions} opts */
	init(opts) {
		return this.#server.init(opts);
	}

	/**
	 * @param {Request} request
	 * @param {import('types').InternalRequestOptions} options
	 */
	respond(request, options) {
		return this.#server.respond(request, options);
	}
}

export { format_response } from '<sveltekit:generated>/server.js';
