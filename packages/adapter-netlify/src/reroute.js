import { reroute } from '__HOOKS__';
import { applyReroute } from '@sveltejs/kit/adapter';

/**
 * @param {Request} request
 * @returns {URL | undefined}
 */
export default function middleware(request) {
	const rerouted_path = applyReroute(new URL(request.url), reroute);
	if (rerouted_path) {
		return rerouted_path;
	}
}
