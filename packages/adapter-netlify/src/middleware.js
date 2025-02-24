import { normalizeUrl } from '@sveltejs/kit';
import { initServer } from 'SERVER_INIT';
import user_middleware from 'MIDDLEWARE';

initServer({
	env: {
		// @ts-ignore
		env: Deno.env.toObject(),
		public_prefix: 'PUBLIC_PREFIX',
		private_prefix: 'PRIVATE_PREFIX'
	}
});

/**
 * @param {Request} request
 * @param {any} context
 */
export default async function middleware(request, context) {
	const { url, wasNormalized, denormalize } = normalizeUrl(request.url);

	if (wasNormalized) {
		request = new Request(url.href, request);

		/**
		 * @param {any} request
		 * @param {any} options
		 */
		const next = (request, options) => {
			if (request instanceof Request) {
				request = new Request(denormalize(request.url), request);
			}
			return context.next(request, options);
		};

		const response = await user_middleware(request, { ...context, next });

		if (response instanceof URL) {
			return new URL(denormalize(response));
		} else {
			return response;
		}
	} else {
		return user_middleware(request, context);
	}
}
