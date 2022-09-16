declare module '0ENV' {
	export function env(key: string, fallback?: any): string;
}

declare module '0HANDLER' {
	export const handler: import('polka').Middleware;
}

declare module '0MANIFEST' {
	import { SSRManifest } from '@sveltejs/kit';
	export const manifest: SSRManifest;
}

declare module '0SERVER' {
	export { Server } from '@sveltejs/kit';
}
