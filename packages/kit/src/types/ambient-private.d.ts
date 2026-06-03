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

declare module '__sveltekit/env' {
	// exported environment variables are defined in env.d.ts

	/** Populate exported environment variables */
	export function set_env(environment: Record<string, string>): void;

	/** public env vars */
	export const explicit_public_env: Record<string, any>;

	/** public env vars that should be inlined when a page is rendered */
	export const rendered_env: Record<string, any>;
}

declare module '__sveltekit/env/private' {
	// exported environment variables are defined in env.d.ts
}

declare module '__sveltekit/env/public/client' {
	// exported environment variables are defined in env.d.ts
}

declare module '__sveltekit/env/public/server' {
	// exported environment variables are defined in env.d.ts
}
