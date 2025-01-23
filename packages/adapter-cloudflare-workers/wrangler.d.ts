import type { IncomingRequestCfProperties } from '@cloudflare/workers-types/experimental';

declare class ExecutionContext {
	waitUntil(promise: Promise<any>): void;
	passThroughOnException(): void;
}

declare type CacheQueryOptions_2 = {
	ignoreMethod?: boolean;
};

declare type CacheRequest = any;

declare type CacheResponse = any;

/**
 * No-op implementation of Cache
 */
declare class Cache_2 {
	delete(request: CacheRequest, options?: CacheQueryOptions_2): Promise<boolean>;
	match(request: CacheRequest, options?: CacheQueryOptions_2): Promise<CacheResponse | undefined>;
	put(request: CacheRequest, response: CacheResponse): Promise<void>;
}

/**
 * No-op implementation of CacheStorage
 */
declare class CacheStorage_2 {
	constructor();
	open(cacheName: string): Promise<Cache_2>;
	get default(): Cache_2;
}

/**
 * Result of the `getPlatformProxy` utility
 */
export declare type PlatformProxy<
	Env = Record<string, unknown>,
	CfProperties extends Record<string, unknown> = IncomingRequestCfProperties
> = {
	/**
	 * Environment object containing the various Cloudflare bindings
	 */
	env: Env;
	/**
	 * Mock of the context object that Workers received in their request handler, all the object's methods are no-op
	 */
	cf: CfProperties;
	/**
	 * Mock of the context object that Workers received in their request handler, all the object's methods are no-op
	 */
	ctx: ExecutionContext;
	/**
	 * Caches object emulating the Workers Cache runtime API
	 */
	caches: CacheStorage_2;
	/**
	 * Function used to dispose of the child process providing the bindings implementation
	 */
	dispose: () => Promise<void>;
};

/**
 * By reading from a `wrangler.toml` file this function generates proxy objects that can be
 * used to simulate the interaction with the Cloudflare platform during local development
 * in a Node.js environment
 *
 * @param options The various options that can tweak this function's behavior
 * @returns An Object containing the generated proxies alongside other related utilities
 */
export declare function getPlatformProxy<
	Env = Record<string, unknown>,
	CfProperties extends Record<string, unknown> = IncomingRequestCfProperties
>(options?: GetPlatformProxyOptions): Promise<PlatformProxy<Env, CfProperties>>;

/**
 * Options for the `getPlatformProxy` utility
 */
export declare type GetPlatformProxyOptions = {
	/**
	 * The name of the environment to use
	 */
	environment?: string;
	/**
	 * The path to the config file to use.
	 * If no path is specified the default behavior is to search from the
	 * current directory up the filesystem for a `wrangler.toml` to use.
	 *
	 * Note: this field is optional but if a path is specified it must
	 *       point to a valid file on the filesystem
	 */
	configPath?: string;
	/**
	 * Flag to indicate the utility to read a json config file (`wrangler.json`)
	 * instead of the toml one (`wrangler.toml`)
	 *
	 * Note: this feature is experimental
	 */
	experimentalJsonConfig?: boolean;
	/**
	 * Indicates if and where to persist the bindings data, if not present or `true` it defaults to the same location
	 * used by wrangler v3: `.wrangler/state/v3` (so that the same data can be easily used by the caller and wrangler).
	 * If `false` is specified no data is persisted on the filesystem.
	 */
	persist?:
		| boolean
		| {
				path: string;
		  };
	/**
	 * Use the experimental file-based dev registry for service discovery
	 *
	 * Note: this feature is experimental
	 */
	experimentalRegistry?: boolean;
};
