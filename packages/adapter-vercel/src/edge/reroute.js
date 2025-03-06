import { reroute } from '__HOOKS__';
import { rewrite, next } from '@vercel/edge';
import { applyReroute } from '@sveltejs/kit/adapter';

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export default async function middleware(request) {
	const resolved_path = await applyReroute(new URL(request.url), reroute);
	if (resolved_path) {
		return rewrite(resolved_path);
	}
	return next(request);
}
