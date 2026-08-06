declare module 'MANIFEST' {
	import type { SSRManifest } from '@sveltejs/kit';

	export const client_files: Set<string>;
	export const manifest: SSRManifest;
	export const prerendered_files: Set<string>;
	export const prerendered_paths: Set<string>;
}

declare module 'SERVER' {
	export { Server } from '@sveltejs/kit';
}

declare module 'SERVER_OPTIONS' {
	const options: Pick<
		import('bun').Serve.Options<undefined>,
		| 'development'
		| 'hostname'
		| 'port'
		| 'idleTimeout'
		| 'maxRequestBodySize'
		| 'reusePort'
		| 'unix'
		| 'ipv6Only'
	>;
	export default options;
}
