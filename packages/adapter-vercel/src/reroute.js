import { reroute } from '__HOOKS__';
import { applyReroute } from '@sveltejs/kit/adapter';
import { rewrite } from '@vercel/functions/middleware';

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export default async function middleware(request) {
	const resolved_url = await applyReroute(request.url, reroute);
	return rewrite(resolved_url);
}
