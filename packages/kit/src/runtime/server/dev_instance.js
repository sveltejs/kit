/** @import { Server, ServerInitOptions } from '@sveltejs/kit' */
/** @import { SSRManifest } from 'types' */
import { DEV_ASSET_ID, DEV_INLINE_STYLES_ID, DEV_REPORT_ERROR_EVENT } from '../../constants.js';
import { create_dev_manifest } from '../../utils/dev_manifest.js';
import { base64_decode } from '../utils.js';
import { server_assets } from './dev_assets.js';
import { patch_fetch } from '../../utils/dev_fetch.js';

// the adapter decides which features its platform supports once it renders requests itself
globalThis.__SVELTEKIT_TRACK__ = () => {};

patch_fetch();

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

/**
 * Has the Vite process log an error and show it in the browser's error overlay.
 * `import.meta.hot` is the only way Vite gives a module to reach the Vite process, so
 * nothing is reported when the environment has no hot channel, such as with `server.hmr: false`
 * @param {any} error
 */
function report(error) {
	// message and stack are not enumerable
	import.meta.hot?.send(DEV_REPORT_ERROR_EVENT, {
		...error,
		message: error?.message,
		stack: error?.stack
	});
}

async function get_manifest() {
	// imported per request, since sveltekit rewrites it when routes change
	const generated = await import('<sveltekit:generated>/manifest-data.js');

	if (current?.generated !== generated) {
		const { root } = generated;

		const manifest = create_dev_manifest(generated.data, {
			load: async (file) => {
				try {
					return await import(/* @vite-ignore */ resolve(root, file));
				} catch (error) {
					report(error);
					throw error;
				}
			},
			inline_styles: async (files) => {
				/** @type {Record<string, string>} */
				const styles = {};
				if (files.length === 0) return styles;

				const query = files.map((file) => `module=${encodeURIComponent(resolve(root, file))}`);

				/** @type {{ default: Array<{ url: string, inline: string }> }} */
				const { default: stylesheets } = await import(
					/* @vite-ignore */ `${DEV_INLINE_STYLES_ID}?${query.join('&')}`
				);

				for (const { url, inline } of stylesheets) {
					try {
						styles[url] = (await import(/* @vite-ignore */ inline)).default;
					} catch {
						// this can happen with dynamically imported modules, like in the node dev server
					}
				}

				return styles;
			},
			server_assets,
			remotes: () => []
		});

		current = { generated, manifest };
	}

	return current;
}

/**
 * Reads an imported asset through the Vite process, which can read the file system
 * @param {string} file the path relative to the project root, or a /@fs path
 */
async function read(file) {
	// the id must not end with the file extension, which other plugins may act on
	/** @type {{ default: string }} */
	const { default: data } = await import(
		/* @vite-ignore */ `${DEV_ASSET_ID}?file=${encodeURIComponent(file)}&base64`
	);

	// @ts-ignore passing a Uint8Array to `new Response(...)` is fine
	return new Response(base64_decode(data)).body;
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
			read: options?.read ?? read
		});
		await server.init();

		// without read, like in production, since it is only for prerendering static files
		return server.respond(
			request,
			/** @type {import('types').InternalRequestOptions} */ (request_options)
		);
	}
};
