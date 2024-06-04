import { reroute } from 'HOOKS';

// we copy the rewrite function from `@vercel/edge` because that package can't co-exist with `@types/node`.
// see https://github.com/sveltejs/kit/pull/9280#issuecomment-1452110035

/**
 * https://github.com/vercel/vercel/blob/4337ea0654c4ee2c91c4464540f879d43da6696f/packages/edge/src/middleware-helpers.ts#L38-L55
 * @param {*} init
 * @param {Headers} headers
 */
function handleMiddlewareField(init, headers) {
	if (init?.request?.headers) {
		if (!(init.request.headers instanceof Headers)) {
			throw new Error('request.headers must be an instance of Headers');
		}

		const keys = [];
		for (const [key, value] of init.request.headers) {
			headers.set('x-middleware-request-' + key, value);
			keys.push(key);
		}

		headers.set('x-middleware-override-headers', keys.join(','));
	}
}

/**
 * https://github.com/vercel/vercel/blob/4337ea0654c4ee2c91c4464540f879d43da6696f/packages/edge/src/middleware-helpers.ts#L101-L114
 * @param {string | URL} destination
 * @returns {Response}
 */
export function rewrite(destination) {
	const headers = new Headers({});
	headers.set('x-middleware-rewrite', String(destination));

	handleMiddlewareField(undefined, headers);

	return new Response(null, {
		headers
	});
}

/**
 * @param {Request} request
 * @returns {Response}
 */
export default function middleware(request) {
	const pathname = reroute({ url: new URL(request.url) });
	return rewrite(new URL(pathname, request.url));
}
