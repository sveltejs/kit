import { get_hooks, options } from '__SERVER__/internal.js';
import { set_manifest } from '__sveltekit/server';
import { DEV } from 'esm-env';
import { initServer } from './init.js';
import { respond } from './respond.js';

/** @type {Promise<any>} */
let init_promise;

export class Server {
	/** @type {import('types').SSROptions} */
	#options;

	/** @type {import('@sveltejs/kit').SSRManifest} */
	#manifest;

	/** @param {import('@sveltejs/kit').SSRManifest} manifest */
	constructor(manifest) {
		/** @type {import('types').SSROptions} */
		this.#options = options;
		this.#manifest = manifest;

		set_manifest(manifest);
	}

	/**
	 * @param {{
	 *   env: Record<string, string>;
	 *   read?: (file: string) => ReadableStream;
	 * }} opts
	 */
	async init(opts) {
		initServer({
			env: {
				private_prefix: options.env_private_prefix,
				public_prefix: options.env_public_prefix,
				env: opts.env
			},
			read: opts.read && { read: opts.read, manifest: this.#manifest }
		});

		// During DEV and for some adapters this function might be called in quick succession (per-request),
		// so we need to make sure we're not invoking this logic (most notably the init hook) multiple times
		await (init_promise ??= (async () => {
			try {
				const module = await get_hooks();

				this.#options.hooks = {
					handle: module.handle || (({ event, resolve }) => resolve(event)),
					handleError: module.handleError || (({ error }) => console.error(error)),
					handleFetch: module.handleFetch || (({ request, fetch }) => fetch(request)),
					reroute: module.reroute || (() => {}),
					transport: module.transport || {}
				};

				if (module.init) {
					await module.init();
				}
			} catch (error) {
				if (DEV) {
					this.#options.hooks = {
						handle: () => {
							throw error;
						},
						handleError: ({ error }) => console.error(error),
						handleFetch: ({ request, fetch }) => fetch(request),
						reroute: () => {},
						transport: {}
					};
				} else {
					throw error;
				}
			}
		})());
	}

	/**
	 * @param {Request} request
	 * @param {import('types').RequestOptions} options
	 */
	async respond(request, options) {
		return respond(request, this.#options, this.#manifest, {
			...options,
			error: false,
			depth: 0
		});
	}
}
