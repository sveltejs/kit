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
	return imagetools_plugin ? [image_plugin(), imagetools_plugin] : [];
}

/**
 * Creates the Svelte image plugin which provides the preprocessor.
 * @returns {import('vite').Plugin}
 */
function image_plugin() {
	const preprocessor = image();

	return {
		name: 'vite-plugin-enhanced-img',
		api: {
			sveltePreprocess: preprocessor
		}
	};
}

/** @type {Record<string,string>} */
const fallback = {
	'.heic': 'jpg',
	'.heif': 'jpg',
	'.avif': 'png',
	'.jpeg': 'jpg',
	'.jpg': 'jpg',
	'.png': 'png',
	'.tiff': 'jpg',
	'.webp': 'png',
	'.gif': 'gif'
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
			if (!qs.has('enhanced-img')) qs;

			const { sizes, w, width } = Object.fromEntries(qs);
			const { widths, kind } = getWidths(width ?? (await metadata()).width, sizes);
			return new URLSearchParams({
				as: 'picture',
				format: `avif;webp;${fallback[path.extname(pathname)] ?? 'png'}`,
				w: widths.join(';'),
				...(kind === 'x' && !w && { basePixels: widths[0].toString() })
			});
		}
	};

	// TODO: should we make formats or sizes configurable besides just letting people override defaultDirectives?
	// TODO: generate img rather than picture if only a single format is provided
	//     by resolving the directives for the URL in the preprocessor
	return imagetools(imagetools_opts);
}

/**
 * Derived from
 * https://github.com/vercel/next.js/blob/3f25a2e747fc27da6c2166e45d54fc95e96d7895/packages/next/src/shared/lib/get-img-props.ts#L132
 * under the MIT license. Copyright (c) Vercel, Inc.
 * @param {number | string | undefined} width
 * @param {string | null | undefined} sizes
 * @param {number[]} [deviceSizes]
 * @param {number[]} [imageSizes]
 * @returns {{ widths: number[]; kind: 'w' | 'x' }}
 */
function getWidths(width, sizes, deviceSizes, imageSizes) {
	width = typeof width === 'string' ? parseInt(width) : width;
	const chosen_device_sizes = deviceSizes || [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
	const all_sizes = (imageSizes || [16, 32, 48, 64, 96, 128, 256, 384]).concat(chosen_device_sizes);

	if (sizes) {
		// Find all the "vw" percent sizes used in the sizes prop
		const viewport_width_re = /(^|\s)(1?\d?\d)vw/g;
		const percent_sizes = [];
		for (let match; (match = viewport_width_re.exec(sizes)); match) {
			percent_sizes.push(parseInt(match[2]));
		}
		if (percent_sizes.length) {
			const smallest_ratio = Math.min(...percent_sizes) * 0.01;
			return {
				widths: all_sizes.filter((s) => s >= chosen_device_sizes[0] * smallest_ratio),
				kind: 'w'
			};
		}
		return { widths: all_sizes, kind: 'w' };
	}
	if (typeof width !== 'number') {
		return { widths: chosen_device_sizes, kind: 'w' };
	}

	// Don't need more than 2x resolution.
	// Most OLED screens that say they are 3x resolution,
	// are actually 3x in the green color, but only 1.5x in the red and
	// blue colors. Showing a 3x resolution image in the app vs a 2x
	// resolution image will be visually the same, though the 3x image
	// takes significantly more data. Even true 3x resolution screens are
	// wasteful as the human eye cannot see that level of detail without
	// something like a magnifying glass.
	// https://blog.twitter.com/engineering/en_us/topics/infrastructure/2019/capping-image-fidelity-on-ultra-high-resolution-devices.html

	// We diverge from the Next.js logic here
	// You can't really scale up an image, so you can't 2x the width
	// Instead the user should provide the high-res image and we'll downscale
	// Also, Vercel builds specific image sizes and picks the closest from those,
	// but we can just build the ones we want exactly.
	return { widths: [Math.round(width / 2), width], kind: 'x' };
}
