import {
	INVALIDATED_PARAM,
	ORIGINAL_PATH_PARAM,
	TRAILING_SLASH_PARAM
} from '../../runtime/shared.js';
import { add_data_suffix, has_data_suffix, strip_data_suffix } from '../../runtime/pathname.js';

/**
 * If your deployment platform supports splitting your app into multiple functions,
 * you should run this in a middleware that runs before the main handler
 * to reroute the request to the correct function.
 *
 * @param {URL} url
 * @param {import("@sveltejs/kit").Reroute} reroute
 * @returns {URL | void}
 * @since 2.17.0
 */
export function applyReroute(url, reroute) {
	const url_copy = new URL(url);

	const is_data_request = has_data_suffix(url.pathname);
	if (is_data_request) {
		url_copy.pathname =
			strip_data_suffix(url_copy.pathname) +
				(url_copy.searchParams.get(TRAILING_SLASH_PARAM) === '1' ? '/' : '') || '/';
		url_copy.searchParams.delete(TRAILING_SLASH_PARAM);
		url_copy.searchParams.delete(INVALIDATED_PARAM);
	}

	// reroute could alter the given URL, so we pass a copy
	const reroute_path = reroute({ url: url_copy });

	if (reroute_path) {
		const new_url = new URL(url);
		new_url.searchParams.set(ORIGINAL_PATH_PARAM, url.pathname);
		new_url.pathname = is_data_request ? add_data_suffix(reroute_path) : reroute_path;
		return new_url;
	}
}
