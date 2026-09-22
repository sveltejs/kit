declare module 'SERVER' {
	export const server: import('@sveltejs/kit').Server;
}

namespace Cloudflare {
	interface Env {
		ASSETS_BINDING: {
			fetch: typeof fetch;
		};
		[key: string]: string | undefined;
	}
}

declare const BASE_PATH: string;
declare const APP_PATH: string;
declare const PRERENDERED: Set<string>;
declare const MANIFEST_ASSETS: Set<string>;
