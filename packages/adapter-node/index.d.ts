import { Adapter } from '@sveltejs/kit';

declare global {
	const SOCKET_PATH: string;
	const HOST: string;
	const PORT: string;
	const ORIGIN: string;
	const XFF_DEPTH: string;
	const ADDRESS_HEADER: string;
	const PROTOCOL_HEADER: string;
	const HOST_HEADER: string;
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
