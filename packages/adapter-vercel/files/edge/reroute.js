import { reroute } from '__HOOKS__';
import { rewrite, next } from '@vercel/edge';

/**
 * @param {Request} request
 * @returns {Response}
 */
export default function middleware(request) {
	const pathname = reroute({ url: new URL(request.url) });
	return pathname ? rewrite(pathname) : next(request);
}
