import type { HTMLImgAttributes } from 'svelte/elements';
import type { Plugin } from 'vite';
import type { Picture } from 'vite-imagetools';
import './ambient.js';

type EnhancedImgAttributes = Omit<HTMLImgAttributes, 'src'> & { src: string | Picture };

// https://svelte.dev/docs/svelte/typescript#enhancing-built-in-dom-types
declare module 'svelte/elements' {
	export interface SvelteHTMLElements {
		'enhanced:img': EnhancedImgAttributes;
	}
}

export function enhancedImages(): Promise<Plugin[]>;
