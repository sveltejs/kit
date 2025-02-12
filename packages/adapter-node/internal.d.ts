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
	export const has_middleware: boolean;
}

declare module 'SERVER' {
	export { Server } from '@sveltejs/kit';
}

declare module 'MIDDLEWARE' {
	import { Middleware } from '@sveltejs/kit';
	export const middleware: Middleware;
}

declare module 'CALL_MIDDLEWARE' {
	import { CallMiddleware } from '@sveltejs/kit';
	export const call_middleware: CallMiddleware;
}
