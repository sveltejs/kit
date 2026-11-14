/** Internal version of $app/server */
declare module '<sveltekit:generated>/server.js' {
	import { SSROptions, ServerHooks } from 'types';

	export const options: SSROptions;
	export function get_hooks(): Promise<Partial<ServerHooks>>;
}

/** What `@sveltejs/kit/adapter/dev` builds the dev manifest from */
declare module '<sveltekit:generated>/manifest-data.js' {
	/** The project root */
	export const root: string;
	/** The path that asset URLs start with */
	export const assets: string;
	/** The instrumentation file, relative to the project root */
	export const instrumentation: string | null;
	export const data: import('types').DevManifestData;
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
