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
