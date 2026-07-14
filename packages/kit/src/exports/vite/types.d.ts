import 'vite/types/customEvent.d.ts';
import type { PageOptions } from './static_analysis/types.js';

declare module 'vite/types/customEvent.d.ts' {
	interface CustomEventMap {
		'sveltekit:server-address': string;
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
		'sveltekit:manifest-data': {
			nodes_page_options: Array<PageOptions | null | undefined>;
			endpoints_page_options: Array<PageOptions | null | undefined>;
		};
		'sveltekit:ssr-load-module-error': Error;
	}
}

export interface EnforcedConfig {
	[key: string]: EnforcedConfig | true;
}
