import type { HTMLImgAttributes } from 'svelte/elements';
import type { Plugin } from 'vite';
import type { Picture, VitePluginOptions as ImagetoolsOptions } from 'vite-imagetools';
import './ambient.js';
import type { Metadata } from 'sharp';

export type { Picture };

export type VitePluginOptions = {
	/**
	 * Get the default formats for enhanced images.
	 *
	 * @param meta Metadata for the source image.
	 * @returns A ';'-separated list of output formats like 'avif;webp;jpg'.
	 *
	 * The default value is the following function:
	 *
	 * ```
	 * (meta) => {
	 * 	let fallback = 'jpg';
	 * 	if (meta.pages && meta.pages > 1) {
	 * 		fallback = meta.format === 'tiff' ? 'tiff' : 'gif';
	 * 	} else if (meta.hasAlpha) {
	 * 		fallback = 'png';
	 * 	}
	 * 	return `avif;webp;${fallback}`;
	 * }
	 * ```
	 */
	defaultFormats?: (meta: Metadata) => string;
	/**
	 * Get the default widths for enhanced images.
	 *
	 * @param width Original image width in physical pixels.
	 * @param sizes The `sizes` attribute value from `<enhanced:img>`, or `null` when not provided.
	 * @returns Width configuration for `vite-imagetools` directives:
	 * - `w`: A ';'-separated list of target output widths.
	 * - `basePixels`: Optional base width used to generate pixel-density (`x`) descriptors.
	 *
	 * The default value is the following function:
	 *
	 * ```
	 * (width, sizes) => {
	 * 	if (sizes) {
	 * 		return { w: `540;768;1080;1366;1536;1920;2560;3000;4096;5120;${width}` };
	 * 	}
	 *
	 * 	const small_width = Math.round(width / 2).toString();
	 * 	return { w: `${small_width};${width}`, basePixels: small_width };
	 * }
	 * ```
	 */
	defaultWidths?: (width: number, sizes: string | null) => { w: string; basePixels?: string };
	/**
	 * Options for the 'vite-imagetools' plugin
	 *
	 * `namedExports` is always set to `false` and cannot be overridden.
	 *
	 * `defaultDirectives` is only used for images that aren't handled by the preprocessor,
	 * i.e. images that aren't imported with `?enhanced` query param and aren't imported through `<enhanced:img src="..." />`.
	 */
	imagetools?: Omit<Partial<ImagetoolsOptions>, 'namedExports'>;
};

export type EnhancedImgAttributes = Omit<HTMLImgAttributes, 'src'> & {
	/**
	 * When [dynamically choosing an image](https://svelte.dev/docs/kit/images#sveltejs-enhanced-img-Dynamically-choosing-an-image)
	 * for use with `<enhanced:img>`, the `src` must be a `Picture` object created with `?enhanced`, rather than a string:
	 *
	 * ```js
	 * import hero from '$lib/assets/hero.jpg?enhanced';
	 * ```
	 *
	 * Note that this object is created automatically if you use `<enhanced:img>` directly:
	 *
	 * ```svelte
	 * <enhanced:img src="$lib/assets/hero.jpg" alt="..." />
	 * ```
	 */
	src: Picture;
};

// https://svelte.dev/docs/svelte/typescript#enhancing-built-in-dom-types
declare module 'svelte/elements' {
	export interface SvelteHTMLElements {
		'enhanced:img': Omit<HTMLImgAttributes, 'src'> & {
			/**
			 * If the `src` is a string, it will be treated as an asset import relative to the current module:
			 *
			 * ```svelte
			 * <enhanced:img src="$lib/assets/hero.jpg" alt="..." />
			 * ```
			 *
			 * When [dynamically choosing an image](https://svelte.dev/docs/kit/images#sveltejs-enhanced-img-Dynamically-choosing-an-image)
			 * (i.e. `src={...}`) it must be a `Picture` object created with `?enhanced`:
			 *
			 * ```js
			 * import hero from '$lib/assets/hero.jpg?enhanced';
			 * ```
			 */
			src: string | Picture;
		};
	}
}

export function enhancedImages(opts?: VitePluginOptions): Promise<Plugin[]>;
