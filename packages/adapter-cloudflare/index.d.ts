import { Adapter } from '@sveltejs/kit';
import './ambient.js';
import { GetPlatformProxyOptions } from 'wrangler';

export default function plugin(options?: AdapterOptions): Adapter;

export interface AdapterOptions {
	/**
	 * Path to your [Wrangler configuration file](https://developers.cloudflare.com/workers/wrangler/configuration/).
	 */
	config?: string;
	/**
	 * Whether to render a plaintext 404.html page or a rendered SPA fallback page
	 * for non-matching asset requests.
	 *
	 * The default behaviour is to return a null-body 404-status response for
	 * non-matching assets requests. However, if the
	 * [`assets.not_found_handling`](https://developers.cloudflare.com/workers/static-assets/routing/#2-not_found_handling)
	 * Wrangler configuration setting is set to `"404-page"`, this page will be
	 * served if a request fails to match an asset. If `assets.not_found_handling`
	 * is set to `"single-page-application"`, the adapter will render a SPA fallback
	 * `index.html` page regardless of the `fallback` option specified.
	 *
	 * @default 'plaintext'
	 */
	fallback?: 'plaintext' | 'spa';

	/**
	 * @deprecated Cloudflare Pages is no longer supported
	 */
	routes?: never;

	/**
	 * Config object passed to [`getPlatformProxy`](https://developers.cloudflare.com/workers/wrangler/api/#getplatformproxy)
	 * during development and preview.
	 */
	platformProxy?: GetPlatformProxyOptions;
}
