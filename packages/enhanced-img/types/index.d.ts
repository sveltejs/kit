import type { Plugin } from 'vite';
import './ambient.js';
import { HTMLImgAttributes } from 'svelte/elements';

// https://svelte.dev/docs/typescript#enhancing-built-in-dom-types
declare module 'svelte/elements' {
	export interface SvelteHTMLElements {
		'enhanced:img': HTMLImgAttributes;
	}
}

export function enhancedImages(): Promise<Plugin[]>;
