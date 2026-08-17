declare module 'MANIFEST' {
	import { SSRManifest } from '@sveltejs/kit';

	export const manifest: SSRManifest;
	export const uncompressed_extensions: Set<string>;
}

declare module 'SERVER' {
	export { Server } from '@sveltejs/kit';
}
