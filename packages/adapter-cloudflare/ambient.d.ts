import { Cache, CacheStorage, IncomingRequestCfProperties } from '@cloudflare/workers-types';

declare global {
	namespace App {
		export interface Platform {
			context?: {
				waitUntil(promise: Promise<any>): void;
			};
			caches?: CacheStorage & { default: Cache };
			cf?: IncomingRequestCfProperties;
		}
	}
}
