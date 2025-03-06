import { reroute } from '__HOOKS__';
import { applyReroute } from '@sveltejs/kit/adapter';

/**
 * @param {Request} request
 * @returns {Promise<URL | undefined>}
 */
export default async function middleware(request) {
	const url = new URL(request.url);
	const resolved_path = await applyReroute(url, reroute);

	// a Netlify rewrite will invoke this function again but with the new URL,
	// so we only return a URL if the rerouted path is different from the original
	// to avoid an endless loop
	if (resolved_path && url.pathname !== resolved_path.pathname) {
		return resolved_path;
	}
}
