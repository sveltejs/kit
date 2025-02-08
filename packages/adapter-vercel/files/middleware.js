import { next, rewrite } from '@vercel/edge';
import { middleware as user_middleware } from 'MIDDLEWARE';
import { call_middleware } from 'CALL_MIDDLEWARE';

// TODO allow customization?
// TODO base path
export const config = {
	// @ts-expect-error will be replaced during build
	matcher: `^(?!/${APP_DIR}/immutable).*`
};

/**
 * @param {Request} request
 */
export default async function middleware(request) {
	const result = await call_middleware(request, user_middleware);

	if (result instanceof Response) return result;

	if (result.did_reroute) {
		const url = new URL(result.request.url);
		result.request_headers.set('x-sveltekit-vercel-rewrite', url.pathname);
		return rewrite(url, {
			headers: result.response_headers,
			request: {
				headers: result.request_headers
			}
		});
	} else {
		return next({ headers: result.response_headers });
	}
}
