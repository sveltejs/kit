import { reroute } from '__HOOKS__';
import { rewrite, next } from '@vercel/edge';
import { applyReroute } from '@sveltejs/kit/adapter';

/**
 * @param {Request} request
 * @returns {Response}
 */
export default function middleware(request) {
	const rerouted_path = applyReroute(new URL(request.url), reroute);
	if (rerouted_path) {
		return rewrite(rerouted_path);
	}
	return next(request);
}
