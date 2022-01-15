import { Adapter } from '@sveltejs/kit';

interface AdapterOptions {
	out?: string;
	precompress?: boolean;
	env?: {
		path?: string;
		host?: string;
		port?: string;
	};
	handle404?: boolean;
}

declare function plugin(options?: AdapterOptions): Adapter;
export = plugin;
