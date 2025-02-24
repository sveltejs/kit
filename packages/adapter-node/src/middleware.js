import { normalizeUrl } from '@sveltejs/kit';
import user_middleware from 'MIDDLEWARE';

/**
 * @type {import('polka').Middleware}
 */
export default function middleware(req, res, next) {
	const { url, wasNormalized, denormalize } = normalizeUrl(req.url);

	if (wasNormalized) {
		req.url = url.pathname + url.search;
		const _next = () => {
			const { pathname, search } = denormalize(req.url);
			req.url = pathname + search;
			return next();
		};

		return user_middleware(req, res, _next);
	} else {
		return user_middleware(req, res, next);
	}
}
