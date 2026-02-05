/**
 * Utility type that makes all properties optional except for the specified keys
 */
export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Required<Pick<T, K>>;

/**
 * We use a custom `Builder` type here to support the minimum version of SvelteKit.
 */
export type Builder2_0_0 = PartialExcept<
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
	| 'writeServer'
	| 'copy'
	| 'compress'
>;
