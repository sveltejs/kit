import { applyReroute } from 'REROUTE';

/** @type {import('@netlify/edge-functions').EdgeFunction} */
export default async function middleware(request, context) {
	const new_request = await applyReroute(request);

	// Netlify rewrites can cause an endless loop because it will re-run this
	// function with the rewritten URL. Therefore, we use `context.next` instead
	// to specifically invoke the next function in the chain with the rewritten URL
	return context.next(new_request);
}
