import { Adapter } from '@sveltejs/kit';
import { GetPlatformProxyOptions } from '@cloudflare/platform-proxy';

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
	 * Options passed to `getPlatformProxy` from `@cloudflare/platform-proxy`, which emulates
	 * the bindings in `cloudflare.config.ts` during development.
	 */
	platformProxy?: PlatformProxyOptions;
}

export type PlatformProxyOptions = Omit<
	Extract<GetPlatformProxyOptions, { url?: undefined }>,
	'configPath' | 'mode' | 'url' | 'secret'
>;
