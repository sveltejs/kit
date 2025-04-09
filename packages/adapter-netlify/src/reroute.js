import { reroute } from '__HOOKS__';
import { applyReroute } from '@sveltejs/kit/adapter';

/**
 * @param {Request} request
 * @returns {Promise<URL | void>}
 */
export default async function middleware(request) {
	const resolved_url = await applyReroute(request.url, reroute);

	// to avoid an endless loop, we only rewrite the URL if the new pathname is different
	// since a Netlify rewrite will always re-invoke this function with the returned URL
	if (resolved_url) {
		return resolved_url;
	}
}
