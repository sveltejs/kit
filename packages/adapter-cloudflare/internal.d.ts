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

type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Required<Pick<T, K>>;

/**
 * We use a custom `Builder` type here to ensure compatibility with the minimum version of SvelteKit.
 */
type Builder2_0_0 = PartialExcept<
	import('@sveltejs/kit').Builder,
	| 'log'
	| 'rimraf'
	| 'mkdirp'
	| 'config'
	| 'prerendered'
	| 'routes'
	| 'createEntries'
	| 'generateFallback'
	| 'generateEnvModule'
	| 'generateManifest'
	| 'getBuildDirectory'
	| 'getClientDirectory'
	| 'getServerDirectory'
	| 'getAppPath'
	| 'writeClient'
	| 'writePrerendered'
	| 'writePrerendered'
	| 'writeServer'
	| 'copy'
	| 'compress'
>;
