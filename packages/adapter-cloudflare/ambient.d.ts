import {
	CacheStorage,
	IncomingRequestCfProperties,
	ExecutionContext
} from '@cloudflare/workers-types';

declare global {
	namespace App {
		export interface Platform {
			env: unknown;
			context: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}
	}
}
