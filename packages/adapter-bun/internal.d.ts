declare module 'MANIFEST' {
	import type { SSRManifest } from '@sveltejs/kit';

	export const client_files: Set<string>;
	export const compressed_files: Set<string>;
	export const manifest: SSRManifest;
	export const prerendered_files: Set<string>;
	export const prerendered_paths: Set<string>;
}

declare module 'SERVER' {
	export { Server } from '@sveltejs/kit';
}

declare module 'SERVER_OPTIONS' {
	const options: Record<string, unknown>;
	export default options;
}
