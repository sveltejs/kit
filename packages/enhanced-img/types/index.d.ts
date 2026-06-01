import type { HTMLImgAttributes } from 'svelte/elements';
import type { Plugin } from 'vite';
import type { Picture } from 'vite-imagetools';
import './ambient.js';

export { Picture };

type EnhancedImgAttributes = Omit<HTMLImgAttributes, 'src'> & { src: string | Picture };

// https://svelte.dev/docs/svelte/typescript#enhancing-built-in-dom-types
declare module 'svelte/elements' {
	export interface SvelteHTMLElements {
		'enhanced:img': EnhancedImgAttributes;
	}
}

export interface EnhancedImgOptions {
	/**
	 * The output formats to generate, in order of preference, e.g. `['avif', 'webp']`. The browser
	 * picks the first format it supports. When set, this replaces the default
	 * `['avif', 'webp', <raster fallback>]`, so it can be used to drop the (often large) raster
	 * fallback for projects that only target modern browsers. When omitted, the default formats are
	 * used and a raster fallback (`png`/`jpg`/`gif`/`tiff`) is chosen based on the source image.
	 */
	formats?: string[];
	/**
	 * A uniform quality (`1`-`100`) applied to every generated format. When omitted, each format's
	 * encoder default is used.
	 */
	quality?: number;
}

export function enhancedImages(options?: EnhancedImgOptions): Promise<Plugin[]>;
