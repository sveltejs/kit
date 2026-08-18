/** Internal version of $app/server */
declare module '<sveltekit:generated>/server.js' {
	import { SSRManifest } from '@sveltejs/kit';
	import { SSROptions, ServerHooks } from 'types';

	export const options: SSROptions;
	export const get_hooks: () => Promise<Partial<ServerHooks>>;
	export let fix_stack_trace: (error: Error) => string;
	export let manifest: SSRManifest;
	export function read_implementation(path: string): ReadableStream;
	export function set_fix_stack_trace(fn: (error: Error) => string): void;
	export function set_manifest(manifest: SSRManifest): void;
	export function set_read_implementation(fn: (path: string) => ReadableStream): void;
}

declare module '<sveltekit:generated>/env/config.js' {
	// exported environment variables are defined in env.d.ts

	/** Populate exported environment variables */
	export function set_env(environment: Record<string, string | undefined>): void;

	/** public env vars */
	export const explicit_public_env: Record<string, any>;

	/** public env vars that should be inlined when a page is rendered */
	export const rendered_env: Record<string, any>;
}

declare module '<sveltekit:generated>/env/private/server.js' {
	// exported environment variables are defined in env.d.ts
}

declare module '<sveltekit:generated>/env/public/client.js' {
	// exported environment variables are defined in env.d.ts
}

declare module '<sveltekit:generated>/env/public/server.js' {
	// exported environment variables are defined in env.d.ts
}

/** Internal version of $app/manifest */
declare module '<sveltekit:generated>/app-manifest.js' {
	export const immutable: Array<{ path: string }>;
	export const assets: Array<{ path: string }>;
	export const prerendered: Array<{ path: string }>;
	export const routes: Array<{ id: string; page: boolean; endpoint: boolean }>;
}
