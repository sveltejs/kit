import {
	CacheStorage,
	IncomingRequestCfProperties,
	ExecutionContext
} from '@cloudflare/workers-types';

declare global {
	namespace App {
		export interface Platform {
			env: unknown;
			ctx: ExecutionContext;
			/** @deprecated Use `ctx` instead */
			context: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}
	}
}
