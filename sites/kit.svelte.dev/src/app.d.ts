// TODO: get this from @sveltejs/enhanced-img
// https://svelte.dev/docs/typescript#enhancing-built-in-dom-types
declare module 'svelte/elements' {
	export interface SvelteHTMLElements {
		'enhanced:img': HTMLImgAttributes;
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
