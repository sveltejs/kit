declare module '__sveltekit/ssr-manifest' {
	import { SSRManifest } from '@sveltejs/kit';

	export const manifest: SSRManifest;
	export const env: Record<string, string>;
	export const remote_address: string | undefined;
	export const base_path: string;
	export const prerendered: Set<string>;
}

declare module '__sveltekit/dev-server' {
	import { InternalServer } from 'types';

	export { InternalServer as Server };
}

declare module '__sveltekit/manifest-data' {
	// eslint-disable-next-line no-duplicate-imports
	import { Asset, PageNode, RouteData } from 'types';

	export const env: Record<string, string>;
	export const kit: {
		appDir: string;
		outDir: string;
		router: {
			resolution: 'client' | 'server';
		};
		paths: {
			assets: string;
			base: string;
			relative: boolean;
		};
	};
	export const mime_types: string[];
	export const manifest_data: {
		routes: RouteData[];
		nodes: PageNode[];
		matchers: string[][];
		assets: Asset[];
	};
}

declare module '__sveltekit/server-assets' {
	export const server_assets: Record<string, number>;
}

declare module '__sveltekit/remotes' {
	export const remotes: Array<{ hash: string; file: string }>;
}
