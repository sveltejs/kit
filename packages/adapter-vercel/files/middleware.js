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
	const { url, neededNormalization, denormalize } = normalizeUrl(request.url);

	if (neededNormalization) {
		request = new Request(url, request);
	}

	const response = await user_middleware.default(request, context);

	if (response instanceof Response && response.headers.has('x-middleware-rewrite')) {
		const rewritten = denormalize(
			/** @type {string} */ (response.headers.get('x-middleware-rewrite'))
		);
		const str =
			rewritten.hostname !== url.hostname ? rewritten.href : rewritten.pathname + rewritten.search;
		response.headers.set('REWRITE_HEADER', str);
		response.headers.set('x-middleware-rewrite', str);
	}

	return response;
}
