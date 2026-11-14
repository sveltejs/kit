/** @import { Server, ServerInitOptions } from '@sveltejs/kit' */
/** @import { SSRManifest } from 'types' */
import { create_dev_manifest } from '../../utils/dev_manifest.js';

// the adapter decides which features its platform supports once it renders requests itself
globalThis.__SVELTEKIT_TRACK__ = () => {};

/** @type {ServerInitOptions | undefined} */
let options;

/** @type {{ generated: typeof import('<sveltekit:generated>/manifest-data.js'), manifest: SSRManifest } | undefined} */
let current;

/**
 * @param {string} root
 * @param {string} file a path relative to the project root
 */
function resolve(root, file) {
	const parts = root.split('/');

	for (const part of file.split('/')) {
		if (part === '..') parts.pop();
		else if (part !== '.') parts.push(part);
	}

	return parts.join('/');
}

async function get_manifest() {
	// imported per request, since sveltekit rewrites it when routes change
	const generated = await import('<sveltekit:generated>/manifest-data.js');

	if (current?.generated !== generated) {
		const { root } = generated;

		const manifest = create_dev_manifest(generated.data, {
			load: (file) => import(/* @vite-ignore */ resolve(root, file)),
			inline_styles: () => Promise.resolve({}),
			server_assets: {},
			remotes: () => []
		});

		current = { generated, manifest };
	}

	return current;
}

/** @type {Server} */
export const server = {
	init(opts) {
		options = opts;
		return Promise.resolve();
	},

	async respond(request, request_options) {
		const env = options?.env ?? {};
		const { generated, manifest } = await get_manifest();

		if (generated.instrumentation) {
			// the instrumentation file may read environment variables, so set them first
			const { set_env } = await import('<sveltekit:generated>/env/config.js');
			set_env(env);
			await import(/* @vite-ignore */ resolve(generated.root, generated.instrumentation));
		}

		const { configure } = await import('./index.js');

		// configures the runtime for each request, like the node dev server
		const server = await configure({
			manifest,
			env,
			assets: generated.assets,
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
