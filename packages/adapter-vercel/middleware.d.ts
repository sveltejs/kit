/**
 * Use this string to scope the middleware to only run on paths other than immutable assets.
 *
 * ```ts
 * import { createMatcher } from '@sveltejs/adapter-vercel';
 *
 * export const config = { matcher: createMatcher() };
 * ```
 * @param {{ appDir?: string, base?: string }} options
 */
export function createMatcher(options?: {
	/** Corresponds to `kit.appDir` in your `svelte.config.js`; only necessary if you deviated from the default. */
	appDir?: string;
	/** Corresponds to `kit.paths.base`; only necessary if you deviated from the default. */
	base?: string;
}): string;

/**
 * Normalizes the incoming URL to remove any differences between direct page hits and
 * data or route resolution requests. Returns the `url` and a `rewrite` function
 * that is aware of said differences, and which should be used in place of the `rewrite`
 * function from `@vercel/edge`.
 *
 * ```ts
 * import { createMiddlewareHelpers } from '@sveltejs/adapter-vercel';
 *
 * const { normalizeUrl } = createMiddlewareHelpers();
 *
 * export default function middleware(request: Request) {
 *  const { url, rewrite } = normalizeUrl(request.url);
 *  if (url.pathname === '/some-page') {
 *   return rewrite('/some-other-page');
 *  }
 * }
 * ```
 *
 * @param {string} url The original URL as given by the request
 */
export function normalizeUrl(url: string): {
	url: URL;
	rewrite: typeof import('@vercel/edge').rewrite;
};

/**
 * `@vercel/edge`'s `next` function
 */
export const next: typeof import('@vercel/edge').next;
