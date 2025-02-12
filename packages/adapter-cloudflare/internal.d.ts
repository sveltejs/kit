declare module 'SERVER' {
	export { Server } from '@sveltejs/kit';
}

declare module 'MANIFEST' {
	import { SSRManifest } from '@sveltejs/kit';

	export const manifest: SSRManifest;
	export const prerendered: Set<string>;
	export const base_path: string;
	export const app_dir: string;
}

declare module 'MIDDLEWARE' {
	import { Middleware } from '@sveltejs/kit';
	export const middleware: Middleware;
}

declare module 'CALL_MIDDLEWARE' {
	import { CallMiddleware } from '@sveltejs/kit';
	export const call_middleware: CallMiddleware;
}
