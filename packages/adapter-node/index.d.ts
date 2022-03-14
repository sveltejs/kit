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
			address?: string;
			protocol?: string;
			host?: string;
		};
	};
	xForwardedForIndex?: number;
}

declare function plugin(options?: AdapterOptions): Adapter;
export = plugin;
