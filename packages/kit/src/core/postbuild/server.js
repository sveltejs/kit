/** @import { Server as KitServer, SSRManifest } from '@sveltejs/kit' */
import { get } from '__sveltekit/manifest-data';
import {
	options,
	set_manifest,
	set_read_implementation,
	set_private_env,
	set_public_env
} from '__SERVER__/internal.js';
import { create_synchronous_read } from '../../runtime/server/utils.js';
import { filter_env } from '../../utils/env.js';

/** @implements {KitServer} */
export class StubServer {
	/** @type {import('@sveltejs/kit').SSRManifest} */
	manifest;

	/** @type {import('types').SSROptions} */
	options;

	// set env, `read`, and `manifest`, in case they're used when we analyse the user's code

	/** @param {SSRManifest} manifest */
	constructor(manifest) {
		this.manifest = manifest;
		/** @type {import('types').SSROptions} */
		this.options = options;

		set_manifest(manifest);
	}

	/** @type {KitServer['init']} */
	init({ env }) {
		const { env_public_prefix, env_private_prefix } = this.options;

		set_private_env(filter_env(env, env_private_prefix, env_public_prefix));
		set_public_env(filter_env(env, env_public_prefix, env_private_prefix));

		set_read_implementation(
			create_synchronous_read(async (file) => {
				const response = await get(`/read?${new URLSearchParams({ file })}`);
				if (!response.ok) {
					throw new Error(
						`read(...) failed: could not fetch ${file} (${response.status} ${response.statusText})`
					);
				}
				return response.body;
			})
		);

		return Promise.resolve();
	}

	/** @type {KitServer['respond']} */
	respond() {
		return Promise.resolve(new Response());
	}
}
