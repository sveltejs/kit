import { Adapter } from '@sveltejs/kit';

declare global {
	const HOST_ENV: string;
	const PATH_ENV: string;
	const PORT_ENV: string;
}

interface AdapterOptions {
	out?: string;
	precompress?: boolean;
	environment?: {
		SOCKET_PATH?: string;
		HOST?: string;
		PORT?: string;
		ORIGIN?: string;
		XFF_DEPTH?: string;
		ADDRESS_HEADER?: string;
		PROTOCOL_HEADER?: string;
		HOST_HEADER?: string;
	};
}

declare function plugin(options?: AdapterOptions): Adapter;
export = plugin;
