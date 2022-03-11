import { Adapter } from '@sveltejs/kit';

declare global {
	const HOST_ENV: string;
	const PATH_ENV: string;
	const PORT_ENV: string;
}

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
	trustProxy?: boolean;
}

declare function plugin(options?: AdapterOptions): Adapter;
export = plugin;
