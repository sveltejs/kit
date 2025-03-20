import { CacheStorage, CfProperties } from '@cloudflare/workers-types';

declare global {
	namespace App {
		export interface Platform {
			env: unknown;
			context: {
				waitUntil(promise: Promise<any>): void;
			};
			caches: CacheStorage;
			cf?: CfProperties;
		}
	}
}
