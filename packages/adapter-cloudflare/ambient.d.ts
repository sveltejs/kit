import {
	CacheStorage,
	IncomingRequestCfProperties,
	ExecutionContext
} from '@cloudflare/workers-types';

declare global {
	namespace App {
		// TODO: consider removing these in favour of users importing them directly from `cloudflare:workers`
		export interface Platform {
			env: unknown;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf: IncomingRequestCfProperties;
		}
	}
}
