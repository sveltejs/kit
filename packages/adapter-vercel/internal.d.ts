declare module 'SERVER' {
	export { Server } from '@sveltejs/kit';
}

declare module 'MANIFEST' {
	import { SSRManifest } from '@sveltejs/kit';
	export const manifest: SSRManifest;
}

declare module '__HOOKS__' {
	import { Reroute } from '@sveltejs/kit';
	export const reroute: Reroute;
}
