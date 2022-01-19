declare module 'APP' {
	import { App } from '@sveltejs/kit';
	export { App };
}

declare module 'MANIFEST' {
	import { SSRManifest } from '@sveltejs/kit';
	export const manifest: SSRManifest;
}
