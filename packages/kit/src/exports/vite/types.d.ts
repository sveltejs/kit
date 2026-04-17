import 'vite/types/customEvent.d.ts';

declare module 'vite/types/customEvent.d.ts' {
	interface CustomEventMap {
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
		'sveltekit:prerender-dependencies': string;
	}
}

export interface EnforcedConfig {
	[key: string]: EnforcedConfig | true;
}

export interface SerializedResponse {
	status: number;
	statusText: string;
	headers: Record<string, string>;
	body: ArrayBuffer;
}
