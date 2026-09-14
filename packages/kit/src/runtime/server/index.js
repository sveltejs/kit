import { set_building, set_prerendering } from '#app/env/server';
import { set_assets } from '../app/paths/internal/server.js';
import {
	set_fix_stack_trace,
	set_host,
	set_manifest,
	set_read_implementation
} from './internal.js';

/**
 * Sets the module-level state the runtime reads, then loads the runtime. Everything that
 * evaluates user code, the env config included, sits behind this import
 * @param {import('types').ServerConfigureOptions} opts
 * @returns {Promise<import('types').ServerInstance>}
 */
export async function configure(opts) {
	const { building, prerendering, manifest, read, assets, fix_stack_trace, env } = opts;

	if (building) set_building();
	if (prerendering) set_prerendering();
	if (manifest) set_manifest(manifest);
	if (read) set_read_implementation(read);
	if (assets !== undefined) set_assets(assets);
	if (fix_stack_trace) set_fix_stack_trace(fix_stack_trace);
	set_host(opts);

	const instance = await import('./instance.js');
	if (env) instance.set_env(env);

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

export { format_response } from './internal.js';
