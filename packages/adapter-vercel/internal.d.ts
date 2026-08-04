declare module 'SERVER' {
	export { Server } from '@sveltejs/kit';
}

declare module 'MANIFEST' {
	import { SSRManifest } from '@sveltejs/kit';
	export const manifest: SSRManifest;
}

declare module 'REROUTE' {
	// eslint-disable-next-line no-duplicate-imports
	import { ApplyReroute } from '@sveltejs/kit';
	export const applyReroute: ApplyReroute;
}
