import {
	CacheStorage,
	IncomingRequestCfProperties,
	ExecutionContext
} from '@cloudflare/workers-types';

declare global {
	namespace App {
		export interface Platform {
			// we should not type `env` here because it will override any type set by
			// the user in `src/app.d.ts`
			ctx: ExecutionContext;
			/** @deprecated Use `ctx` instead */
			context: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}
	}
}
