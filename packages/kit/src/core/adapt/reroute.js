import { normalizeUrl } from '../../exports/index.js';
import { has_resolution_suffix, is_route_id_resolution_path } from '../../runtime/pathname.js';
import { ORIGINAL_PATH_HEADER } from '../../runtime/shared.js';
import { get_remote_id } from '../../runtime/server/remote-functions.js';
import { app_dir, base } from '$app/paths/internal/server';
import { reroute } from '__HOOKS__';

/**
 * @param {Request} request
 * @returns {Promise<Request>}
 */
export async function applyReroute(request) {
	const url = new URL(request.url);

	const remote_id = get_remote_id(url);
	/** Whether this is a `/${app_dir}/routes/<route_id>/__route.js` request, used by `preloadCode` */
	const is_route_id_resolution_request =
		has_resolution_suffix(url.pathname) && is_route_id_resolution_path(url.pathname, base, app_dir);

	let new_request;

	// `reroute` hooks receive pathnames, so they must not run for route-ID resolution requests
	if (remote_id || is_route_id_resolution_request) {
		new_request = new Request(request);
	} else {
		const { url: normalized_url, denormalize } = normalizeUrl(url);
		const resolved_path = await reroute({ url: normalized_url, fetch });

		// bail out if there were no changes to the pathname
		if (!resolved_path || resolved_path === normalized_url.pathname) {
			new_request = new Request(request);
		} else {
			new_request = new Request(denormalize(resolved_path), request);
		}
	}

	// we always set the header so that the requester can't fake it
	new_request.headers.set(ORIGINAL_PATH_HEADER, url.pathname);

	return new_request;
}
