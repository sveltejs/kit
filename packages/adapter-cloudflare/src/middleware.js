import { normalizeUrl } from '@sveltejs/kit';
import { onRequest as user_middleware } from 'MIDDLEWARE';

/**
 * @param {{ request: Request, next: (init?: any, options?: any) => any}} context
 */
export async function onRequest(context) {
	const { url, wasNormalized, denormalize } = normalizeUrl(context.request.url);

	if (wasNormalized) {
		const request = new Request(url.href, context.request);

		/**
		 * @param {any} request
		 * @param {any} options
		 */
		const next = (request, options) => {
			if (request) {
				request = new Request(
					denormalize(typeof request === 'string' ? request : request.url),
					options ?? (request instanceof Request ? request : context.request)
				);
			}
			return context.next(request, options);
		};

		return user_middleware({ ...context, request, next });
	} else {
		return user_middleware(context);
	}
}
