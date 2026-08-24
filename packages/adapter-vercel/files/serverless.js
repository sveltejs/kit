import { createReadableStream } from '@sveltejs/kit/node';
import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';
import process from 'node:process';

const server = new Server(manifest);

await server.init({
	env: process.env,
	read: createReadableStream
});

export default {
	/**
	 * @param {Request} request
	 * @returns {Promise<Response>}
	 */
	fetch(request) {
		// If this is an ISR request, the requested pathname is encoded
		// as a search parameter, so we need to extract it
		const url = new URL(request.url);
		const pathname = url.searchParams.get('__pathname');

		if (pathname) {
			url.pathname = pathname;
			url.searchParams.delete('__pathname');

			request = new Request(url, request);
		}

		return server.respond(request, {
			getClientAddress() {
				return /** @type {string} */ (request.headers.get('x-forwarded-for'));
			}
		});
	}
};
