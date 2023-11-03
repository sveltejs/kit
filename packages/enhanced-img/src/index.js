import path from 'node:path';
import { image } from './preprocessor.js';

/**
 * @returns {Promise<import('vite').Plugin[]>}
 */
export async function enhancedImages() {
	const imagetools_plugin = await imagetools();
	if (!imagetools_plugin) {
		console.error(
			'@sveltejs/enhanced-img: vite-imagetools is not installed. Skipping build-time optimizations'
		);
	}
	return imagetools_plugin && !process.versions.webcontainer
		? [image_plugin(imagetools_plugin), imagetools_plugin]
		: [];
}

/**
 * Creates the Svelte image plugin which provides the preprocessor.
 * @param {import('vite').Plugin} imagetools_plugin
 * @returns {import('vite').Plugin}
 */
function image_plugin(imagetools_plugin) {
	/**
	 * @type {{
	 *   plugin_context: import('rollup').PluginContext
	 *   imagetools_plugin: import('vite').Plugin
	 * }}
	 */
	const opts = {
		// @ts-expect-error populated when build starts so we cheat on type
		plugin_context: undefined,
		imagetools_plugin
	};
	const preprocessor = image(opts);

	return {
		name: 'vite-plugin-enhanced-img',
		api: {
			sveltePreprocess: preprocessor
		},
		buildStart() {
			opts.plugin_context = this;
		}
	};
}

/** @type {Record<string,string>} */
const fallback = {
	'.avif': 'png',
	'.gif': 'gif',
	'.heif': 'jpg',
	'.jpeg': 'jpg',
	'.jpg': 'jpg',
	'.png': 'png',
	'.tiff': 'jpg',
	'.webp': 'png'
};

async function imagetools() {
	/** @type {typeof import('vite-imagetools').imagetools} */
	let imagetools;
	try {
		({ imagetools } = await import('vite-imagetools'));
	} catch (err) {
		return;
	}

	/** @type {Partial<import('vite-imagetools').VitePluginOptions>} */
	const imagetools_opts = {
		defaultDirectives: async ({ pathname, searchParams: qs }, metadata) => {
			if (!qs.has('enhanced')) return new URLSearchParams();

			return new URLSearchParams({
				as: 'picture',
				format: `avif;webp;${fallback[path.extname(pathname)] ?? 'png'}`,
				w: get_widths(qs.get('imgWidth') ?? (await metadata()).width).join(';')
			});
		},
		namedExports: false
	};

	// TODO: should we make formats or sizes configurable besides just letting people override defaultDirectives?
	// TODO: generate img rather than picture if only a single format is provided
	//     by resolving the directives for the URL in the preprocessor
	return imagetools(imagetools_opts);
}

/**
 * @param {number | string | undefined} width
 * @returns {number[]}
 */
function get_widths(width) {
	const widths = [360, 428, 720, 856, 1366, 1536, 1920, 3072, 3840];
	width = typeof width === 'string' ? parseInt(width) : width;
	if (typeof width === 'number') {
		if (width <= 300) {
			widths.push(width);
			widths.push(Math.round(width * 50) / 100);
		} else if (width <= 600) {
			widths.push(Math.round(width * 50) / 100);
		} else if (width > 3840) {
			widths.push(width);
		}
	}
	return widths;
}
