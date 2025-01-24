import { reroute } from '__HOOKS__';
import { applyReroute } from '@sveltejs/kit/adapter';

/**
 * @param {Request} request
 * @returns {URL | undefined}
 */
export default function middleware(request) {
	const url = new URL(request.url);
	const rerouted_path = applyReroute(url, reroute);

	// a rewrite on Netlify will cause this function to run again with the new URL
	// instead of moving onto the route function, so we only return a URL if
	// the reroute path is different from the original to avoid an endless loop
	if (rerouted_path && url.pathname !== rerouted_path.pathname) {
		return rerouted_path;
	}
}
