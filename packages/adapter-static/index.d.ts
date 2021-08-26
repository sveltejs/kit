import { Adapter } from '@sveltejs/kit';

interface AdapterOptions {
	pages?: string;
	assets?: string;
	fallback?: string;
	outputFileName?: (opts: { path: string; is_html: boolean }) => string;
}

declare function plugin(options?: AdapterOptions): Adapter;
export = plugin;
