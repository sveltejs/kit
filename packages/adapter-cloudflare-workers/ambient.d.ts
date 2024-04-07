/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		export interface Platform {
			context: {
				waitUntil(promise: Promise<any>): void;
			};
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}
	}
}

export {};
