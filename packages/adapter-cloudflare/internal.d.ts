/** Our Vite plugin will correctly substitute this during dev/build */
declare module 'SERVER' {
	export { Server } from '@sveltejs/kit';
}

/** Our Vite plugin will correctly substitute this during dev/build */
declare module 'MANIFEST' {
	import { SSRManifest } from '@sveltejs/kit';

	export const manifest: SSRManifest;
}

/** Vite's `define` setting will replace this with the configured `assets.binding` value */
declare const __SVELTEKIT_CLOUDFLARE_ASSETS_BINDING__: string;
