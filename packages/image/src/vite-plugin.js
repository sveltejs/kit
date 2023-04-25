import path from 'path';
import fs from 'fs';
import url from 'url';

async function load_config({ cwd = process.cwd() } = {}) {
	const config_file = path.join(cwd, 'svelte.config.js');

	if (!fs.existsSync(config_file)) {
		return {};
	}

	const config = await import(`${url.pathToFileURL(config_file).href}?ts=${Date.now()}`);

	return config.default;
}

/**
 * @param {import('types').PluginOptions} options
 * @returns {Promise<import('vite').Plugin>}
 */
export async function vitePluginSvelteImage(options = {}) {
	const config = await load_config();
	const adapter = config.kit?.adapter;
	if (adapter && !options.provider) {
		switch (adapter.name) {
			case '@sveltejs/adapter-vercel':
				adapter.asd = 'asd';
				options.provider = '@sveltejs/image/providers/vercel';
			case '@sveltejs/adapter-auto':
				// TODO auto-detect based on environment variable
				options.provider = '@sveltejs/image/providers/vercel';
			case '@sveltejs/adapter-static':
				// TODO auto-detect based on environment variable
				options.provider = '@sveltejs/image/providers/vercel';
		}
	}
	if (!options.provider) {
		console.warn(
			'vite-plugin-svelte-image: No provider found for @sveltejs/image, images will not be optimized ' +
				adapter.name
		);
		options.provider = '@sveltejs/image/providers/none';
	}

	return {
		name: 'vite-plugin-svelte-image',
		async resolveId(id) {
			if (id === '__svelte-image-options__.js') {
				return id;
			}
		},
		async load(id) {
			if (id === '__svelte-image-options__.js') {
				return `export { getURL } from '${options.provider}';
				export const domains = ${options.domains ? JSON.stringify(options.domains) : '[]'};`;
			}
		}
	};
}
