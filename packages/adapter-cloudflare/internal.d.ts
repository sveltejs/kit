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

declare module '__sveltekit/vite-environment' {
	// eslint-disable-next-line no-duplicate-imports
	import { SSRManifest } from '@sveltejs/kit';

	export const manifest: SSRManifest;
	export const env: Record<string, string>;
	export const remote_address: string | undefined;
	export const base_path: string;
	export const prerendered: Set<string>;
}
