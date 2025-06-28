declare module 'SERVER' {
	export { Server } from '@sveltejs/kit';
}

declare module 'MANIFEST' {
	import { SSRManifest } from '@sveltejs/kit';

	export const manifest: SSRManifest;
	export const prerendered: Set<string>;
	export const app_path: string;
	export const base_path: string;
}

declare module 'WORKER' {
	import { ExportedHandler } from '@cloudflare/workers-types';
	import { WorkerEntrypoint } from 'cloudflare:workers';

	const handlers: Omit<ExportedHandler, 'fetch'> | WorkerEntrypoint;

	export default handlers;
}
