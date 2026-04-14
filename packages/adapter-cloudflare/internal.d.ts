declare module 'SERVER' {
	export { Server } from '@sveltejs/kit';
}

declare module 'MANIFEST' {
	import { SSRManifest } from '@sveltejs/kit';

	export const manifest: SSRManifest;
	export const prerendered: Set<string>;
	export const basePath: string;
}

/** Vite's `define` setting will replace this with the configured `assets.binding` value */
declare const __SVELTEKIT_CLOUDFLARE_ASSETS_BINDING__: string;
