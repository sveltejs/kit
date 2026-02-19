import type { HTMLImgAttributes } from 'svelte/elements';
import type { Plugin } from 'vite';
import type { Picture, VitePluginOptions as ImagetoolsOptions } from 'vite-imagetools';
import './ambient.js';
import { Metadata } from 'sharp';

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
	 * 		return { w: `540;768;1080;1366;1536;1920;2560;3000;4096;5120${width}` };
	 * 	}
	 *
	 * 	const small_width = Math.round(width / 2).toString();
	 * 	return { w: `${small_width};${width}`, basePixels: small_width };
	 * }
	 * ```
	 */
	defaultWidths?: (width: number, sizes: string | null) => { w: string; basePixels?: string };
	/** Options for the 'vite-imagetools' plugin */
	imagetools?: ImagetoolsOptions;
};

type EnhancedImgAttributes = Omit<HTMLImgAttributes, 'src'> & { src: string | Picture };

// https://svelte.dev/docs/svelte/typescript#enhancing-built-in-dom-types
declare module 'svelte/elements' {
	export interface SvelteHTMLElements {
		'enhanced:img': EnhancedImgAttributes;
	}
}

export function enhancedImages(opts?: VitePluginOptions): Promise<Plugin[]>;
