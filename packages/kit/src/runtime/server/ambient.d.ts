declare module '__SERVER__/internal.js' {
	export const options: import('types').SSROptions;
	export const get_hooks: () => Promise<Partial<import('types').ServerHooks>>;
	export const set_manifest: (manifest: import('@sveltejs/kit').SSRManifest) => void;
	export const set_read_implementation: (read: (file: string) => ReadableStream) => void;
	export const set_private_env: (env: Record<string, string>) => void;
	export const set_public_env: (env: Record<string, string>) => void;
}
