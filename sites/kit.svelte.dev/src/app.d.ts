// TODO: get this from @sveltejs/static-img
// https://svelte.dev/docs/typescript#enhancing-built-in-dom-types
declare module 'svelte/elements' {
	export interface SvelteHTMLElements {
		'optimized:img': HTMLImgAttributes;
	}
}

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
