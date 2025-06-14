import { Server } from '0SERVER';
import { manifest } from 'MANIFEST';

const server = new Server(manifest);

const initialized = server.init({
	// @ts-ignore
	env: Deno.env.toObject()
});

/**
 * @param { Request } request
 * @param { any } context
 * @returns { Promise<Response> }
 */
export default async function handler(request, context) {
	await initialized;
	return server.respond(request, {
		platform: { context },
		getClientAddress() {
			return context.ip;
		}
	});
}
