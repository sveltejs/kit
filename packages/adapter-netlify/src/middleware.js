import { middleware as user_middleware } from 'MIDDLEWARE';
import { call_middleware } from 'CALL_MIDDLEWARE';

/**
 * @param {Request} request
 * @param {import('@netlify/edge-functions').Context} context
 */
export default async function middleware(request, context) {
	const result = await call_middleware(request, user_middleware);

	if (result instanceof Response) return result;

	const has_additional_headers =
		[...result.request_headers.keys()].length > 0 || [...result.response_headers.keys()].length > 0;

	if (result.did_reroute && !has_additional_headers) {
		// Fast path
		return new URL(result.request.url);
	} else {
		const response = await context.next(result.request);
		result.add_response_headers(response);
		return response;
	}
}
