/* eslint-disable n/prefer-global/process --
 Vercel Edge Runtime does not support node:process */
import { normalizeUrl } from '@sveltejs/kit';
import { initServer } from 'SERVER_INIT';
import * as user_middleware from 'MIDDLEWARE';

initServer({
	env: {
		env: /** @type {Record<string, string>} */ (process.env),
		public_prefix: 'PUBLIC_PREFIX',
		private_prefix: 'PRIVATE_PREFIX'
	}
});

export const config = user_middleware.config;

/**
 * @param {Request} request
 * @param {any} context
 */
export default async function middleware(request, context) {
	const { url, denormalize } = normalizeUrl(request.url);

	if (url.pathname !== new URL(request.url).pathname) {
		request = new Request(url, request);
	}

	const response = await user_middleware.default(request, context);

	if (response instanceof Response && response.headers.has('x-middleware-rewrite')) {
		let rewritten = new URL(
			/** @type {string} */ (response.headers.get('x-middleware-rewrite')),
			url
		);

		if (rewritten.hostname === url.hostname) {
			rewritten = denormalize(rewritten.pathname);
			response.headers.set('REWRITE_HEADER', rewritten.pathname + rewritten.search);
			response.headers.set('x-middleware-rewrite', rewritten.pathname + rewritten.search);
		}
	}

	return response;
}
