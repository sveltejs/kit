import type {
	CacheStorage,
	ExecutionContext,
	IncomingRequestCfProperties
} from '@cloudflare/workers-types';

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface Platform {
			caches: CacheStorage;
			cf: IncomingRequestCfProperties;
			context: ExecutionContext;
			env: Env;
		}
	}
}

export {};
