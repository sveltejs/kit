import { reroute } from '__HOOKS__';
import { applyReroute } from '@sveltejs/kit/adapter';

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export default async function middleware(request) {
	const resolved_url = await applyReroute(request.url, reroute);
	// We have to use a fetch here because Vercel's edge rewrite discards query
	// parameters without values. See https://github.com/vercel/vercel/issues/12902
	return fetch(resolved_url, request);
}
