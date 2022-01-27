import { Adapter } from '@sveltejs/kit';

interface AdapterOptions {
	out?: string;
	precompress?: boolean;
	env?: {
		path?: string;
		host?: string;
		port?: string;
		origin?: string;
		headers?: {
			protocol?: string;
			host?: string;
		};
	};
}

declare function plugin(options?: AdapterOptions): Adapter;
export = plugin;
