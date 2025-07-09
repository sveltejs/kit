import { Adapter } from '@sveltejs/kit';
import './ambient.js';

declare global {
	const ENV_PREFIX: string;
}

interface AdapterOptions {
	out?: string;
	precompress?: boolean;
	envPrefix?: string;
	external?:
		| (string | RegExp)[]
		| RegExp
		| string
		| ((id: string, parentId: string, isResolved: boolean) => boolean);
}

export default function plugin(options?: AdapterOptions): Adapter;
