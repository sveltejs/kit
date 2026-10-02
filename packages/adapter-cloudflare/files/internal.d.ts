declare module 'SERVER' {
	export const server: import('@sveltejs/kit').Server;
}

declare module 'virtual:todo-name-cloudflare-handler' {
	export const respond: (request: Request) => Promise<Response>;
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
