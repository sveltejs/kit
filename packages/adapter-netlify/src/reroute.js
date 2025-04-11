import { reroute } from '__HOOKS__';
import { applyReroute } from '@sveltejs/kit/adapter';

/** @type {import('@netlify/edge-functions').EdgeFunction} */
export default async function middleware(request, context) {
	const resolved_url = await applyReroute(request.url, reroute);

	// Netlify rewrites can cause an endless loop because it will re-run this
	// function with the rewritten URL. Therefore, we use `context.next` instead
	// to specifically invoke the next function in the chain with the rewritten URL
	const new_request = new Request(resolved_url, request);
	return context.next(new_request);
}
