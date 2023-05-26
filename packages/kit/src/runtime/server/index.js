import { respond } from './respond.js';
import { set_private_env, set_public_env } from '../shared-server.js';
import { options, get_hooks } from '__SERVER__/internal.js';
import { DEV } from 'esm-env';

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
	}

	/**
	 * @param {{
	 *   env: Record<string, string>
	 * }} opts
	 */
	async init({ env }) {
		// Take care: Some adapters may have to call `Server.init` per-request to set env vars,
		// so anything that shouldn't be rerun should be wrapped in an `if` block to make sure it hasn't
		// been done already.
		const entries = Object.entries(env);

		const prefix = this.#options.env_public_prefix;
		const prv = Object.fromEntries(entries.filter(([k]) => !k.startsWith(prefix)));
		const pub = Object.fromEntries(entries.filter(([k]) => k.startsWith(prefix)));

		set_private_env(prv);
		set_public_env(pub);

		if (!this.#options.hooks) {
			try {
				const module = await get_hooks();

				this.#options.hooks = {
					handle: module.handle || (({ event, resolve }) => resolve(event)),
					handleError: module.handleError || (({ error }) => console.error(error)),
					handleFetch: module.handleFetch || (({ request, fetch }) => fetch(request))
				};
			} catch (error) {
				if (DEV) {
					this.#options.hooks = {
						handle: () => {
							throw error;
						},
						handleError: ({ error }) => console.error(error),
						handleFetch: ({ request, fetch }) => fetch(request)
					};
				} else {
					throw error;
				}
			}
		}
	}

	/**
	 * @param {Request} request
	 * @param {import('types').RequestOptions} options
	 */
	async respond(request, options) {
		// TODO this should probably have been removed for 1.0 — i think we can get rid of it?
		if (!(request instanceof Request)) {
			throw new Error(
				'The first argument to server.respond must be a Request object. See https://github.com/sveltejs/kit/pull/3384 for details'
			);
		}

		return respond(request, this.#options, this.#manifest, {
			...options,
			error: false,
			depth: 0
		});
	}
}
