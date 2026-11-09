import { Adapter } from '@sveltejs/kit';

export default function plugin(options?: AdapterOptions): Adapter;

export interface AdapterOptions {
	/**
	 * Whether to render a plaintext 404.html page or a rendered SPA fallback page
	 * for non-matching asset requests.
	 *
	 * For Cloudflare Workers, the default behaviour is to return a null-body
	 * 404-status response for non-matching assets requests. However, if the
	 * [`assets.notFoundHandling`](https://developers.cloudflare.com/workers/static-assets/routing/#2-not_found_handling)
	 * setting in `cloudflare.config.ts` is set to `"404-page"`, this page will be
	 * served if a request fails to match an asset. If `assets.notFoundHandling`
	 * is set to `"single-page-application"`, the adapter will render a SPA fallback
	 * `index.html` page regardless of the `fallback` option specified.
	 *
	 * @default 'plaintext'
	 */
	fallback?: 'plaintext' | 'spa';

	/**
	 * Whether and where to persist the data of local bindings, such as KV and D1, during
	 * `vite dev` and `vite preview`. Passed to the Cloudflare Vite plugin's `persistState` option.
	 *
	 * @default true
	 */
	persistState?: boolean | { path: string };

	/**
	 * Whether bindings with `dev.remote` in `cloudflare.config.ts` connect to the real resources
	 * on your Cloudflare account during `vite dev` and `vite preview`. Passed to the Cloudflare
	 * Vite plugin's `remoteBindings` option.
	 *
	 * @default true
	 */
	remoteBindings?: boolean;
}

export interface PluginOptions {
	persistState?: AdapterOptions['persistState'];
	remoteBindings?: AdapterOptions['remoteBindings'];
}
