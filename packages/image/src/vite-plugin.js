import { format, imagetools, resize } from 'vite-imagetools';

/**
 * @param {import('types').PluginOptions} options
 * @returns {import('vite').Plugin[]}
 */
export function vitePluginSvelteImage(options = {}) {
	return [image_plugin(options), image_tools(options)];
}

/**
 * Creates the Svelte image plugin which provides the `__svelte_image_options__` module used in `Image.svelte`.
 * @param {import('types').PluginOptions} options
 * @returns {import('vite').Plugin}
 */
function image_plugin(options) {
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
export const domains = ${options.domains ? JSON.stringify(options.domains) : '[]'};
export const device_sizes = ${JSON.stringify(device_sizes(options))};
export const image_sizes = ${JSON.stringify(image_sizes(options))};`;

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

/**
 * Wraps `vite-imagetools` to provide a `generate` output format that returns an object with `src`, `width`, `height` and `srcset` properties.
 * @param {import('types').PluginOptions} options
 */
function image_tools(options) {
	return imagetools({
		include: /^[^?]+\.(heic|heif|avif|jpeg|jpg|png|tiff|webp|gif)\?(generate)$/,
		extendOutputFormats: (builtins) => {
			/** @type {import('vite-imagetools').OutputFormat} */
			function generate() {
				return (metadata) => {
					return {
						src: metadata[0].src,
						width: metadata[0].width,
						height: metadata[0].height,
						srcset: metadata.slice(1).map((m) => {
							return {
								src: m.src,
								w: m.width
							};
						})
					};
				};
			}
			return {
				...builtins,
				generate
			};
		},
		resolveConfigs: (entries, output_formats) => {
			const generate = entries.find(([k]) => k === 'generate');
			if (!generate || !output_formats['generate']) {
				return /** @type {any} */ (undefined);
			}

			return [
				{ generate: 'original' },
				...device_sizes(options).map((w) => ({
					generate: w
				}))
			];
		},
		extendTransforms: (builtins) => {
			return [customDirective, ...builtins];
			/** @type {import('vite-imagetools').TransformFactory<{ generate: number |'original' }>} */
			function customDirective(config, ctx) {
				if (!config.generate) {
					return;
				}

				const resizeTransform =
					config.generate === 'original'
						? /** @type {import('vite-imagetools').ImageTransformation} */
						  (i) => i
						: resize({ width: String(config.generate) }, ctx);
				const formatTransform = format({ format: 'webp' }, ctx);

				if (!resizeTransform || !formatTransform) return;

				return async function customTransform(image) {
					// It would be great if we could not return anything at more than double the original image width,
					// but that's not possible with vite-imagetools currently
					return await formatTransform(resizeTransform(image));
				};
			}
		}
	});
}

// TODO this is duplicated in SvelteKit

/**
 * @param {import('types').PluginOptions} options
 */
function device_sizes(options) {
	return options.deviceSizes ?? [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
}

/**
 * @param {import('types').PluginOptions} options
 */
function image_sizes(options) {
	return options.imageSizes ?? [64, 96, 128, 256, 384];
}
