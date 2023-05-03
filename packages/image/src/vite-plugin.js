import { importAssets } from 'svelte-preprocess-import-assets';

/**
 * @template T
 * @typedef {{ [K in keyof T]-?: Extract<T[K], Function> extends never ? RecursiveRequired<T[K]> : T[K]; }} RecursiveRequired;
 */

/**
 * @typedef {RecursiveRequired<import('types/vite').PluginOptions>} PluginOptions
 */

/**
 * @param {import('types/vite').PluginOptions} options
 * @returns {Promise<import('vite').Plugin[]>}
 */
export async function images(options = {}) {
	const resolved_options = get_options(options);
	const imagetools_plugin = await imagetools(resolved_options.build);
	if (!options.runtime?.providers && !image_plugin) {
		console.warn(
			'@sveltejs/image: vite-imagetools is not installed and no CDN provider was found. Images will not be optimized. Configuration should be updated or @sveltejs/image should be removed'
		);
	} else if (!options.runtime?.providers) {
		console.log(
			'@sveltejs/image: no CDN provider was found. Images will be optimized at build-time only'
		);
	} else if (!imagetools_plugin) {
		console.log(
			'@sveltejs/image: vite-imagetools is not installed. Skipping build-time optimizations'
		);
	}
	return imagetools_plugin
		? [image_plugin(resolved_options.runtime), imagetools_plugin]
		: [image_plugin(resolved_options.runtime)];
}

/**
 * Creates the Svelte image plugin which provides the `__svelte_image_options__` module used in `Image.svelte`.
 * @param {PluginOptions['runtime']} options
 * @returns {import('vite').Plugin}
 */
function image_plugin(options) {
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
export const domains = ${options.domains ? JSON.stringify(options.domains) : '[]'};
export const device_sizes = ${JSON.stringify(device_sizes(options))};
export const image_sizes = ${JSON.stringify(image_sizes(options))};`;

	const assets_preprocessor = importAssets({
		sources: () => [
			{
				tag: 'Image',
				srcAttributes: ['src']
			}
		],
		// must start with '.'
		urlFilter: (url) => /^\./.test(url)
	});

	return {
		name: 'vite-plugin-svelte-image',
		api: {
			sveltePreprocess: {
				/** @param {any} input */
				markup(input) {
					if (input.content.includes('@sveltejs/image') && assets_preprocessor.markup) {
						return assets_preprocessor.markup(input);
					} else {
						return {
							code: input.content
						};
					}
				}
			}
		},
		async resolveId(id) {
			if (id === 'virtual:__svelte-image-options__.js') {
				return `\0${id}`;
			}
		},
		async load(id) {
			if (id === '\0virtual:__svelte-image-options__.js') {
				return file;
			}
		}
	};
}

/**
 * @param {PluginOptions['build']} options
 */
async function imagetools(options) {
	/** @type {typeof import('vite-imagetools').imagetools} */
	let imagetools;
	/** @type {typeof import('vite-imagetools').format} */
	let format;
	/** @type {typeof import('vite-imagetools').resize} */
	let resize;
	/** @type {typeof import('vite-imagetools').getMetadata} */
	let getMetadata;
	try {
		({ imagetools, format, resize, getMetadata } = await import('vite-imagetools'));
	} catch (err) {
		return;
	}

	return imagetools({
		defaultDirectives: new URLSearchParams(
			options.formats.length === 1
				? `as=img$format=${options.formats[0]}&w=${device_sizes(options).join(';')}`
				: `as=picture&format=${options.formats.join(';')}&w=${device_sizes(options).join(';')}`
		)
	});
}

/**
 * @param {import('types/vite').PluginOptions} options
 * @returns {RecursiveRequired<import('types/vite').PluginOptions>}
 */
function get_options(options) {
	return {
		build: {
			formats: options.build?.formats ?? ['avif', 'webp', 'png'],
			sizes: options.build?.sizes ?? [640, 828, 1200, 2048, 3840]
		},
		runtime: {
			providers: options.runtime?.providers ?? { default: '@sveltejs/image/providers/none' },
			domains: options.runtime?.domains ?? []
		}
	};
}

// TODO make these configurable from the outside

/**
 * @param {PluginOptions['runtime']} [_options]
 */
function device_sizes(_options) {
	return [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
}

/**
 * @param {PluginOptions['runtime']} [_options]
 */
function image_sizes(_options) {
	return [64, 96, 128, 256, 384];
}
