import { ORIGINAL_PATH_PARAM, RESOLVED_PATH_PARAM } from '../../runtime/shared.js';
import { normalizeUrl } from '../index.js';

/**
 * If your deployment platform supports splitting your app into multiple functions,
 * you should run this in a middleware that runs before the main handler
 * to reroute the request to the correct function.
 * @param {URL} url
 * @param {import("@sveltejs/kit").Reroute} reroute
 * @returns {Promise<URL | void>}
 * @since 2.19.0
 */
export async function applyReroute(url, reroute) {
	const { url: normalized_url, denormalize } = normalizeUrl(url);

	const resolved_path = await reroute({ url: normalized_url });
	normalized_url.searchParams.set(ORIGINAL_PATH_PARAM, url.pathname);
	normalized_url.searchParams.set(RESOLVED_PATH_PARAM, resolved_path ?? url.pathname);

	if (resolved_path) {
		return denormalize(normalized_url);
	}
}
