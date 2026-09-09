declare module 'SERVER' {
	export const server: import('@sveltejs/kit').Server;
}

interface AssetEntry {
	/** path on disk, relative to the served directory */
	file: string;
	size: number;
	/** content hash */
	etag: string;
	/** size of the gzip variant, if one was written */
	gz?: number;
	/** size of the brotli variant, if one was written */
	br?: number;
}

interface AssetTable {
	entries: Array<[string, AssetEntry]>;
	/** `[alias, key]` pairs, e.g. `['/about', '/about.html']` */
	aliases: Array<[string, string]>;
}

declare const ASSETS: AssetTable;
declare const PRERENDERED_ASSETS: AssetTable;
