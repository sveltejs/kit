declare module 'MANIFEST' {
	import { SSRManifest } from '@sveltejs/kit';

	export const base: string;
	export const manifest: SSRManifest;
	export const prerendered: Set<string>;
}

declare module 'SERVER' {
	export { Server } from '@sveltejs/kit';
}
