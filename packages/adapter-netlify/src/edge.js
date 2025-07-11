import { Server } from '0SERVER';
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
	// @ts-ignore
	env: Deno.env.toObject(),
	read: (file) => fetchFile({ origin, file })
});

/** @type {import('@netlify/edge-functions').EdgeFunction} */
export default async function handler(request, context) {
	if (!origin) {
		origin = new URL(request.url).origin;
		await initialized;
	}

	return server.respond(request, {
		platform: { context },
		getClientAddress() {
			return context.ip;
		}
	});
}
