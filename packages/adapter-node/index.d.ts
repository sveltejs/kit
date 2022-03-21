import { Adapter } from '@sveltejs/kit';

declare global {
	const ENV_PREFIX: string;
}

interface AdapterOptions {
	out?: string;
	precompress?: boolean;
	envPrefix?: string;
}

declare function plugin(options?: AdapterOptions): Adapter;
export = plugin;
