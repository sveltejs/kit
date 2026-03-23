declare module '__sveltekit/ssr-manifest' {
	// eslint-disable-next-line no-duplicate-imports
	import { SSRManifest } from '@sveltejs/kit';

	export const manifest: SSRManifest;
	export const env: Record<string, string>;
	export const remote_address: string | undefined;
	export const base_path: string;
	export const prerendered: Set<string>;
}

declare module '__sveltekit/dev' {
	import { InternalServer } from 'types';

	export { InternalServer as Server };
}
