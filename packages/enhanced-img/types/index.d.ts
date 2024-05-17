import 'svelte/elements';
import type { Plugin } from 'vite';
import type { Picture } from 'vite-imagetools';
import './ambient.js';

// https://svelte.dev/docs/typescript#enhancing-built-in-dom-types
declare module 'svelte/elements' {
	export interface SvelteHTMLElements {
		'enhanced:img': Omit<HTMLImgAttributes, 'src'> & {
			src: string | Picture;
		};
	}
}

export function enhancedImages(): Promise<Plugin[]>;
