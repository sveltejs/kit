import { applyReroute } from '@sveltejs/kit/adapter';
import entry from './serverless.js';

export default {
	/**
	 * @param {Request} request
	 * @returns {Promise<Response>}
	 */
	fetch: async (request) => {
		const response = await entry.fetch(request);
		return applyReroute(response, rewrite);
	}
};

/**
 * @param {URL} url
 * @returns {Response}
 */
function rewrite(url) {
	// taken from https://github.com/vercel/vercel/blob/main/packages/functions/src/middleware.ts#L106
	return new Response(null, {
		headers: {
			'x-middleware-rewrite': String(url)
		}
	});
}
