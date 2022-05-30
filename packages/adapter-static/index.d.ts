import { Adapter } from '@sveltejs/kit';

interface AdapterOptions {
	pages?: string;
	assets?: string;
	fallback?: string;
	precompress?: boolean;
}

export default function plugin(options?: AdapterOptions): Adapter;
