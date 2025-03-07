import { reroute } from '__HOOKS__';
import { applyReroute } from '@sveltejs/kit/adapter';

/**
 * @param {Request} request
 * @returns {Promise<URL | void>}
 */
export default async function middleware(request) {
	const resolved_url = await applyReroute(request.url, reroute);

	// a Netlify rewrite will invoke this function again but with the new URL,
	// so we only return a URL if the rerouted path is different from the original
	// to avoid an endless loop
	if (request.url !== resolved_url.href) {
		return resolved_url;
	}
}
