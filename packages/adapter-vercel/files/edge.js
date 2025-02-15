/* eslint-disable n/prefer-global/process --
 Vercel Edge Runtime does not support node:process */
import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';

const server = new Server(manifest);
const initialized = server.init({
	env: /** @type {Record<string, string>} */ (process.env)
});

/**
 * @param {Request} request
 * @param {import('../index.js').RequestContext} context
 */
export default async (request, context) => {
	await initialized;

	const pathname = request.headers.get('REWRITE_HEADER');
	if (pathname) {
		let url = new URL(request.url);
		url.pathname = pathname;
		request = new Request(url, request);
		request.headers.delete('x-sveltekit-vercel-rewrite');
	}

	return server.respond(request, {
		getClientAddress() {
			return /** @type {string} */ (request.headers.get('x-forwarded-for'));
		},
		platform: {
			context
		}
	});
};
