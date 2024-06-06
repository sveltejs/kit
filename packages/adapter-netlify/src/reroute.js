import { reroute } from '__HOOKS__';

/**
 * @param {Request} request
 * @returns {URL | undefined}
 */
export default function middleware(request) {
	const url = new URL(request.url);
	const pathname = reroute({ url });

	if (pathname) {
		return new URL(pathname, request.url);
	}
}
