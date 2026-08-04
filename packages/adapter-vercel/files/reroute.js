import { applyReroute } from 'REROUTE';

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export default async function middleware(request) {
	const new_request = await applyReroute(request);

	// taken from https://github.com/vercel/vercel/blob/main/packages/functions/src/middleware.ts#L106
	return new Response(null, {
		headers: {
			'x-middleware-rewrite': new_request.url
		}
	});
}
