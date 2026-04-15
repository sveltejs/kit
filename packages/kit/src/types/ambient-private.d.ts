/** Internal version of $app/environment */
declare module '__sveltekit/environment' {
	export const building: boolean;
	export const prerendering: boolean;
	export const version: string;
}

/** Internal version of $app/paths */
declare module '__sveltekit/paths' {
	export let base: '' | `/${string}`;
	export let assets: '' | `https://${string}` | `http://${string}` | '/_svelte_kit_assets';
	export let app_dir: string;
	export let relative: boolean;
	export function reset(): void;
	export function override(paths: { base: string; assets: string }): void;
	export function set_assets(path: string): void;
}

/** Internal version of $app/server */
declare module '__sveltekit/server' {
	import { SSRManifest } from '@sveltejs/kit';

	export let manifest: SSRManifest;
	export function read_implementation(path: string): ReadableStream;
	export function set_manifest(manifest: SSRManifest): void;
	export function set_read_implementation(fn: (path: string) => ReadableStream): void;
}

/** Used to construct the SSR manifest in development from a Node-agnostic environment */
declare module '__sveltekit/manifest-data' {
	import { ManifestData } from 'types';

	export const env: Record<string, string>;
	export const mime_types: Record<string, string>;
	export const manifest_data: ManifestData;
	export function get(pathname: string): Promise<Response>;
}

/** Used to read the filesystem during development from an environment without `node:fs` */
declare module '__sveltekit/server-assets' {
	export const server_assets: Record<string, number>;
	export const server_assets_content: Record<string, Buffer<ArrayBuffer>>;
}

/** Used to identify remote functions processed by Vite from any environment */
declare module '__sveltekit/remotes' {
	export const remotes: Array<{ hash: string; file: string }>;
}
