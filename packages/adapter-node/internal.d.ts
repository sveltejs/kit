declare module 'SERVER' {
	export const server: import('@sveltejs/kit').Server;
}

interface AssetEntry {
	/** path on disk, relative to the served directory until `create_asset_map` resolves it */
	file: string;
	size: number;
	/** content hash */
	etag: string;
	/** size and content hash of the gzip variant, if one was written */
	gz?: [number, string];
	/** size and content hash of the brotli variant, if one was written */
	br?: [number, string];
}

interface AssetTable {
	entries: Array<[string, AssetEntry]>;
	/** `[alias, key]` pairs, e.g. `['/about', '/about.html']` */
	aliases: string[][];
}

declare const ASSETS: AssetTable;
declare const PRERENDERED_ASSETS: AssetTable;
