import { Adapter } from '@sveltejs/kit';
import './ambient.js';

export default function plugin(config?: Config): Adapter;

export interface ServerlessConfig {
	/**
	 * Whether to use [Edge Functions](https://vercel.com/docs/concepts/functions/edge-functions) (`'edge'`) or [Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions) (`'nodejs18.x'`, `'nodejs20.x'` etc).
	 * @default Same as the build environment
	 */
	runtime?: `nodejs${number}.x`;
	/**
	 * To which regions to deploy the app. A list of regions.
	 * More info: https://vercel.com/docs/concepts/edge-network/regions
	 */
	regions?: string[];
	/**
	 * Maximum execution duration (in seconds) that will be allowed for the Serverless Function.
	 * Serverless only.
	 */
	maxDuration?: number;
	/**
	 * Amount of memory (RAM in MB) that will be allocated to the Serverless Function.
	 * Serverless only.
	 */
	memory?: number;
	/**
	 * If `true`, this route will always be deployed as its own separate function
	 */
	split?: boolean;

	/**
	 * [Incremental Static Regeneration](https://vercel.com/docs/concepts/incremental-static-regeneration/overview) configuration.
	 * Serverless only.
	 */
	isr?:
		| {
				/**
				 * Expiration time (in seconds) before the cached asset will be re-generated by invoking the Serverless Function. Setting the value to `false` means it will never expire.
				 */
				expiration: number | false;
				/**
				 * Random token that can be provided in the URL to bypass the cached version of the asset, by requesting the asset
				 * with a __prerender_bypass=<token> cookie.
				 *
				 * Making a `GET` or `HEAD` request with `x-prerender-revalidate: <token>` will force the asset to be re-validated.
				 */
				bypassToken?: string;
				/**
				 * List of query string parameter names that will be cached independently. If an empty array, query values are not considered for caching. If undefined each unique query value is cached independently
				 */
				allowQuery?: string[] | undefined;
		  }
		| false;
}

type ImageFormat = 'image/avif' | 'image/webp';

type RemotePattern = {
	protocol?: 'http' | 'https';
	hostname: string;
	port?: string;
	pathname?: string;
};

type ImagesConfig = {
	sizes: number[];
	domains: string[];
	remotePatterns?: RemotePattern[];
	minimumCacheTTL?: number; // seconds
	formats?: ImageFormat[];
	dangerouslyAllowSVG?: boolean;
	contentSecurityPolicy?: string;
	contentDispositionType?: string;
};

export interface EdgeConfig {
	/**
	 * Whether to use [Edge Functions](https://vercel.com/docs/concepts/functions/edge-functions) (`'edge'`) or [Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions) (`'nodejs18.x'`, `'nodejs20.x'` etc).
	 */
	runtime?: 'edge';
	/**
	 * To which regions to deploy the app. A list of regions or `'all'`.
	 * More info: https://vercel.com/docs/concepts/edge-network/regions
	 */
	regions?: string[] | 'all';
	/**
	 * List of packages that should not be bundled into the Edge Function.
	 * Edge only.
	 */
	external?: string[];
	/**
	 * If `true`, this route will always be deployed as its own separate function
	 */
	split?: boolean;
}

export type Config = (EdgeConfig | ServerlessConfig) & {
	/**
	 * https://vercel.com/docs/build-output-api/v3/configuration#images
	 */
	images?: ImagesConfig;
};

// we copy the RequestContext interface from `@vercel/edge` because that package can't co-exist with `@types/node`.
// see https://github.com/sveltejs/kit/pull/9280#issuecomment-1452110035

/**
 * An extension to the standard `Request` object that is passed to every Edge Function.
 *
 * @example
 * ```ts
 * import type { RequestContext } from '@vercel/edge';
 *
 * export default async function handler(request: Request, ctx: RequestContext): Promise<Response> {
 *   // ctx is the RequestContext
 * }
 * ```
 */
export interface RequestContext {
	/**
	 * A method that can be used to keep the function running after a response has been sent.
	 * This is useful when you have an async task that you want to keep running even after the
	 * response has been sent and the request has ended.
	 *
	 * @example
	 *
	 * <caption>Sending an internal error to an error tracking service</caption>
	 *
	 * ```ts
	 * import type { RequestContext } from '@vercel/edge';
	 *
	 * export async function handleRequest(request: Request, ctx: RequestContext): Promise<Response> {
	 *  try {
	 *    return await myFunctionThatReturnsResponse();
	 *  } catch (e) {
	 *    ctx.waitUntil((async () => {
	 *      // report this error to your error tracking service
	 *      await fetch('https://my-error-tracking-service.com', {
	 *        method: 'POST',
	 *        body: JSON.stringify({
	 *          stack: e.stack,
	 *          message: e.message,
	 *          name: e.name,
	 *          url: request.url,
	 *        }),
	 *      });
	 *    })());
	 *    return new Response('Internal Server Error', { status: 500 });
	 *  }
	 * }
	 * ```
	 */
	waitUntil(
		/**
		 * A promise that will be kept alive until it resolves or rejects.
		 */ promise: Promise<unknown>
	): void;
}
