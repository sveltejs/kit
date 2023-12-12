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
	 *   plugin_context: import('vite').Rollup.PluginContext
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

			const img_width = qs.get('imgWidth');
			const width = img_width ? parseInt(img_width) : (await metadata()).width;
			if (!width) {
				console.warn(`Could not determine width of image ${pathname}`);
				return new URLSearchParams();
			}

			const { widths, kind } = get_widths(width, qs.get('imgSizes'));
			return new URLSearchParams({
				as: 'picture',
				format: `avif;webp;${fallback[path.extname(pathname)] ?? 'png'}`,
				w: widths.join(';'),
				...(kind === 'x' && !qs.has('w') && { basePixels: widths[0].toString() })
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
 * @param {number} width
 * @param {string | null} sizes
 * @returns {{ widths: number[]; kind: 'w' | 'x' }}
 */
function get_widths(width, sizes) {
	// We don't really know what the user wants here. But if they have an image that's really big
	// then we can probably assume they're always displaying it full viewport/breakpoint.
	// If the user is displaying a responsive image then the size usually doesn't change that much
	// Instead, the number of columns in the design may reduce and the image may take a greater
	// fraction of the screen.
	// Assume if they're bothering to specify sizes that it's going to take most of the screen
	// as that's the case where an image may be rendered at very different sizes. Otherwise, it's
	// probably a responsive image and a single size is okay (two when accounting for HiDPI).
	if (sizes) {
		// Use common device sizes. Doesn't hurt to include larger sizes as the user will rarely
		// provide an image that large.
		// https://screensiz.es/
		// https://gs.statcounter.com/screen-resolution-stats (note: logical. we want physical)
		// Include 1080 because lighthouse uses a moto g4 with 360 logical pixels and 3x pixel ratio.
		const widths = [540, 768, 1080, 1366, 1536, 1920, 2560, 3000, 4096, 5120];
		widths.push(width);
		return { widths, kind: 'w' };
	}

	// Don't need more than 2x resolution. Note that due to this optimization, pixel density
	// descriptors will often end up being cheaper as many mobile devices have pixel density ratios
	// near 3 which would cause larger images to be chosen on mobile when using sizes.

	// Most OLED screens that say they are 3x resolution, are actually 3x in the green color, but
	// only 1.5x in the red and blue colors. Showing a 3x resolution image in the app vs a 2x
	// resolution image will be visually the same, though the 3x image takes significantly more
	// data. Even true 3x resolution screens are wasteful as the human eye cannot see that level of
	// detail without something like a magnifying glass.
	// https://blog.twitter.com/engineering/en_us/topics/infrastructure/2019/capping-image-fidelity-on-ultra-high-resolution-devices.html
	return { widths: [Math.round(width / 2), width], kind: 'x' };
}
