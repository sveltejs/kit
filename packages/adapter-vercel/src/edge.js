/* eslint-disable n/prefer-global/process --
 Vercel Edge Runtime does not support node:process */
import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';
import { fetchFile } from '@sveltejs/kit/adapter';

const server = new Server(manifest);

/**
 * We don't know the origin until we receive a request, but
 * that's guaranteed to happen before we call `read`
 * @type {string}
 */
let origin;

const initialized = server.init({
	env: /** @type {Record<string, string>} */ (process.env),
	read: (file) => fetchFile({ origin, file })
});

/**
 * @param {Request} request
 * @param {import('../index.js').RequestContext} context
 */
export default async (request, context) => {
	if (!origin) {
		origin = new URL(request.url).origin;
		await initialized;
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
