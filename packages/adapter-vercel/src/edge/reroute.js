import { reroute } from '__HOOKS__';
import { rewrite } from '@vercel/edge';
import { applyReroute } from '@sveltejs/kit/adapter';

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export default async function middleware(request) {
	const resolved_url = await applyReroute(request.url, reroute);
	return rewrite(resolved_url);
}
