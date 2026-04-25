import 'vite/types/customEvent.d.ts';

declare module 'vite/types/customEvent.d.ts' {
	interface CustomEventMap {
		'sveltekit:port': number;
		'sveltekit:remotes': {
			hash: string;
			file: string;
		};
		'sveltekit:remote': string;
		'sveltekit:server-assets': {
			filepath: string;
			size: number;
			data: string;
		};
		'sveltekit:ssr-load-module-error': Error;
		'sveltekit:prerender-assets': string;
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
