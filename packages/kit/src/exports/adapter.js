/** @import { Reroute } from '@sveltejs/kit' */

import { ORIGINAL_PATH_HEADER } from '../runtime/shared.js';
import { normalizeUrl } from './index.js';

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
 * export default function middleware(request) {
 *   return applyReroute(request, reroute);
 * }
 * ```
 * @param {Request} request
 * @param {Reroute} reroute
 * @returns {Promise<Request>}
 * @since 3.0.0
 */
export async function applyReroute(request, reroute) {
	const url = new URL(request.url);

	const { url: normalized_url, denormalize } = normalizeUrl(url);
	const resolved_path = await reroute({ url: normalized_url, fetch });

	let new_request;

	// bail out if there were no changes to the pathname
	if (!resolved_path || resolved_path === normalized_url.pathname) {
		new_request = new Request(request);
	} else {
		new_request = new Request(denormalize(resolved_path), request);
	}

	// we always set the header so that the requester can't fake it
	new_request.headers.set(ORIGINAL_PATH_HEADER, url.pathname);

	return new_request;
}
