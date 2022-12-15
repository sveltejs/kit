import { Adapter } from '@sveltejs/kit';

declare global {
	const ENV_PREFIX: string;
}

declare namespace App {
	export interface Platform {
		originalReq: Request;
	}
}

interface AdapterOptions {
	out?: string;
	precompress?: boolean;
	envPrefix?: string;
}

export default function plugin(options?: AdapterOptions): Adapter;
