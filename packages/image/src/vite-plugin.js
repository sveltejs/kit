/**
 * @param {import('types').PluginOptions} options
 * @returns {Promise<import('vite').Plugin>}
 */
export async function vitePluginSvelteImage(options = {}) {
	if (!options.providers) {
		console.warn(
			'vite-plugin-svelte-image: No provider found for @sveltejs/image, images not optimized at build time will not be optimized'
		);
	}
	const providers =
		!options.providers || !Object.keys(options.providers).length
			? { default: '@sveltejs/image/providers/none' }
			: options.providers;

	const providerImports = Object.keys(providers)
		.map(
			(provider) =>
				`import * as ${provider === 'default' ? '_default' : provider} from '${
					providers[provider]
				}';`
		)
		.join('\n');
	const providerObject =
		'{\n\t' +
		Object.keys(providers)
			.map((provider) => `${provider}: ${provider === 'default' ? '_default' : provider}`)
			.join(',\n\t') +
		'\n}';
	const file = `${providerImports}
export const providers = ${providerObject};
export const domains = ${options.domains ? JSON.stringify(options.domains) : '[]'};`;

	return {
		name: 'vite-plugin-svelte-image',
		async resolveId(id) {
			if (id === '__svelte-image-options__.js') {
				return id;
			}
		},
		async load(id) {
			if (id === '__svelte-image-options__.js') {
				return file;
			}
		}
	};
}
