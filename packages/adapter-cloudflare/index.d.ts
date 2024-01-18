import { Adapter } from '@sveltejs/kit';
import './ambient.js';

export default function plugin(options?: AdapterOptions): Adapter;

export interface AdapterOptions {
	/**
	 * Whether to render a plaintext 404.html page, or a rendered SPA fallback page. This page will
	 * only be served when a request that matches an entry in `routes.exclude` fails to match an asset.
	 *
	 * Most of the time `plaintext` is sufficient, but if you are using `routes.exclude` to manually
	 * exclude a set of prerendered pages without exceeding the 100 route limit, you may wish to
	 * use `spa` instead to avoid showing an unstyled 404 page to users.
	 *
	 * @default 'plaintext'
	 */
	fallback?: 'plaintext' | 'spa';

	/**
	 * Customize the automatically-generated `_routes.json` file
	 * https://developers.cloudflare.com/pages/platform/functions/routing/#create-a-_routesjson-file
	 */
	routes?: {
		/**
		 * Routes that will be invoked by functions. Accepts wildcards.
		 * @default ["/*"]
		 */
		include?: string[];

		/**
		 * Routes that will not be invoked by functions. Accepts wildcards.
		 * `exclude` takes priority over `include`.
		 *
		 * To have the adapter automatically exclude certain things, you can use these placeholders:
		 *
		 * - `<build>` to exclude build artifacts (files generated by Vite)
		 * - `<files>` for the contents of your `static` directory
		 * - `<prerendered>` for prerendered routes
		 * - `<all>` to exclude all of the above
		 *
		 * @default ["<all>"]
		 */
		exclude?: string[];
	};
	/**
	 * Enable Node.js compatibility
	 * https://developers.cloudflare.com/workers/runtime-apis/nodejs/
	 * @default undefined
	 */
	nodeCompat?: boolean;
}

export interface RoutesJSONSpec {
	version: 1;
	description: string;
	include: string[];
	exclude: string[];
}
