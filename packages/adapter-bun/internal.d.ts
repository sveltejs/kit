declare module 'MANIFEST' {
	import type { SSRManifest } from '@sveltejs/kit';

	export const manifest: SSRManifest;
}

declare module 'ROUTES' {
	export function asset_path(file: string): string;
	export const routes: Serve.Routes<never, string>;
}

declare module 'SERVER' {
	export { Server } from '@sveltejs/kit';
}

declare module 'SERVER_OPTIONS' {
	const options: Pick<
		import('bun').Serve.Options<never>,
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
