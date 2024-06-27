declare module 'ENV' {
	export function env(key: string, fallback?: any): string;
}

declare module 'HANDLER' {
	export const handler: import('polka').Middleware;
}

declare module 'MANIFEST' {
	import { SSRManifest } from '@sveltejs/kit';

	export const base: string;
	export const manifest: SSRManifest;
	export const prerendered: Set<string>;
}

declare module 'SERVER' {
	export { Server } from '@sveltejs/kit';
}
