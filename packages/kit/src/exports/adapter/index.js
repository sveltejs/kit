import { ORIGINAL_PATH_PARAM } from '../../runtime/shared.js';
import { normalizeUrl } from '../index.js';

/**
 * If your deployment platform supports splitting your app into multiple functions,
 * you should run this in a middleware that runs before the main handler
 * to reroute the request to the correct function and [generate a server-side manifest](https://svelte.dev/docs/kit/@sveltejs-kit#Builder)
 * with the `rerouteMiddleware` option set to `true`.
 * @example
 * ```js
 * import { applyReroute } from '@sveltejs/kit/adapter';
 * // replace __HOOKS__ with the path to the reroute hook obtained from `builder.getReroutePath()`
 * import { reroute } from '__HOOKS__';
 *
 * export default async function middleware(request) {
 *   return applyReroute(request.url, reroute);
 * }
 * ```
 * @param {string} url
 * @param {import("@sveltejs/kit").Reroute} reroute
 * @returns {Promise<URL>}
 * @since 2.21.0
 */
export async function applyReroute(url, reroute) {
	const url_copy = new URL(url);
	url_copy.searchParams.set(ORIGINAL_PATH_PARAM, url_copy.pathname);

	const { url: normalized_url, denormalize } = normalizeUrl(url);
	const resolved_path = await reroute({ url: normalized_url, fetch });

	// bail out if there were no changes to the pathname
	if (!resolved_path || resolved_path === url_copy.pathname) {
		// we always return a URL with the x-sveltekit-original-path param set
		// so that the requester can't fake it
		return url_copy;
	}

	url_copy.pathname = resolved_path;
	return denormalize(url_copy);
}
