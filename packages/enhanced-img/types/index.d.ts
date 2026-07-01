import type { HTMLImgAttributes } from 'svelte/elements';
import type { Plugin } from 'vite';
import type { Picture } from 'vite-imagetools';
import './ambient.js';

export { Picture };

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

export function enhancedImages(): Promise<Plugin[]>;
