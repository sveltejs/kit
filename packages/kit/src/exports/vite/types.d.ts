import 'vite/types/customEvent.d.ts';

declare module 'vite/types/customEvent.d.ts' {
	interface CustomEventMap {
		'sveltekit:port': number;
		'sveltekit:remotes': {
			hash: string;
			file: string;
		};
		'sveltekit:server-assets': {
			filepath: string;
			size: number;
			data: string;
		};

		'sveltekit:ssr-load-module': Error;
		'sveltekit:prerender-assets-update': string;
		'sveltekit:prerender-dependencies': Record<
			string,
			{
				response: SerialisedResponse;
				body: null | string | Uint8Array;
			}
		>;
	}
}

export interface SerialisedResponse {
	status: number;
	statusText: string;
	headers: Record<string, string>;
	body: ArrayBuffer;
}

export interface EnforcedConfig {
	[key: string]: EnforcedConfig | true;
}
