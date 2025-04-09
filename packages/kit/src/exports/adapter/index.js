import { ORIGINAL_PATH_PARAM } from '../../runtime/shared.js';
import { normalizeUrl } from '../index.js';

/**
 * If your deployment platform supports splitting your app into multiple functions,
 * you should run this in a middleware that runs before the main handler
 * to reroute the request to the correct function.
 * @param {string} url
 * @param {import("@sveltejs/kit").Reroute} reroute
 * @returns {Promise<URL | void>} The new URL if the pathname was changed. Otherwise, it doesn't return anything.
 * @since 2.21.0
 */
export async function applyReroute(url, reroute) {
	const new_url = new URL(url);
	new_url.searchParams.set(ORIGINAL_PATH_PARAM, new_url.pathname);

	const { url: normalized_url, denormalize } = normalizeUrl(url);
	const resolved_path = await reroute({ url: normalized_url, fetch });

	// bail out if there were no changes to the pathname
	if (!resolved_path || resolved_path === new_url.pathname) {
		return;
	}

	new_url.pathname = resolved_path;
	return denormalize(new_url);
}
