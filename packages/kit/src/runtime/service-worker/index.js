import { respond } from './respond.js';
import { set_public_env, set_safe_public_env } from '../shared-server.js';
import { options, get_hooks } from '__SERVICE_WORKER__/internal.js';
import { DEV } from 'esm-env';
import { filter_public_env } from '../../utils/env.js';
import { set_manifest } from '__sveltekit/service-worker';

/** @type {Promise<any>} */
let init_promise;

export class Server {
	/** @type {import('types').SWROptions} */
	#options;

	/** @type {import('types').SWRManifest} */
	#manifest;

	/** @param {import('types').SWRManifest} manifest */
	constructor(manifest) {
		/** @type {import('types').SWROptions} */
		this.#options = options;
		this.#manifest = manifest;

		set_manifest(manifest);
	}

	/**
	 * @param {{
	 *   env: Record<string, string>;
	 * }} opts
	 */
	async init({ env }) {
		// Take care: Some adapters may have to call `Server.init` per-request to set env vars,
		// so anything that shouldn't be rerun should be wrapped in an `if` block to make sure it hasn't
		// been done already.

		// set env, in case it's used in initialisation
		const prefixes = {
			public_prefix: this.#options.env_public_prefix,
			private_prefix: this.#options.env_private_prefix
		};

		const public_env = filter_public_env(env, prefixes);

		set_public_env(public_env);
		set_safe_public_env(public_env);

		// During DEV and for some adapters this function might be called in quick succession,
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
	 * @returns {Promise<Response>}
	 */
	async respond(request) {
		return respond(request, this.#options, this.#manifest, {
			error: false,
			depth: 0
		});
	}
}
