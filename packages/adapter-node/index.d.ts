import { Adapter } from '@sveltejs/kit';

interface AdapterOptions {
	serverEntryPoint?: string;
	out?: string;
	precompress?: boolean;
}

declare function plugin(options?: AdapterOptions): Adapter;
export = plugin;
