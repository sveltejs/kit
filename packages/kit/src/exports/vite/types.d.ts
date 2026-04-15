import 'vite/types/customEvent.d.ts';
import { Manifest } from 'vite';
import { ServerMetadata } from 'types';

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
		'sveltekit:analyse-request': {
			private_env: Record<string, string>;
			public_env: Record<string, string>;
			hash: boolean;
			server_manifest: Manifest;
			tracked_features: Record<string, string[]>;
		};
		'sveltekit:analyse-response': ServerMetadata;
		'sveltekit:analyse-prerender-functions-request': {
			private_env: Record<string, string>;
			public_env: Record<string, string>;
		};
		'sveltekit:analyse-prerender-functions-response': boolean;
		'sveltekit:prerender-functions-response': string[];
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
