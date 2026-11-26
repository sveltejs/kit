import { Adapter } from '@sveltejs/kit';
import { GetPlatformProxyOptions } from 'wrangler';

export default function plugin(options?: AdapterOptions): Adapter;

export interface AdapterOptions {
	/**
	 * Path to your [Wrangler configuration file](https://developers.cloudflare.com/workers/wrangler/configuration/).
	 */
	config?: string;

	/**
	 * Config object passed to [`getPlatformProxy`](https://developers.cloudflare.com/workers/wrangler/api/#getplatformproxy)
	 * during development. The `persist` and `remoteBindings` options also apply during preview.
	 */
	platformProxy?: GetPlatformProxyOptions;

	/**
	 * Whether to build a Worker. It defaults to `true`. Set this to `false` if you only
	 * want to deploy static assets. In that case, the adapter sets
	 * [`assets.not_found_handling`](https://developers.cloudflare.com/workers/static-assets/#routing-behavior)
	 * to `"404-page"`, if not already set.
	 *
	 * @default true
	 * @since 9.0.0
	 */
	worker?: boolean;
}
