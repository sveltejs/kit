import { installPolyfills } from '@sveltejs/kit/node/polyfills';
import { createReadableStream } from '@sveltejs/kit/node';
import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';
import process from 'node:process';

installPolyfills();

const server = new Server(manifest);

await server.init({
	env: /** @type {Record<string, string>} */ (process.env),
	read: createReadableStream
});

const DATA_SUFFIX = '/__data.json';

export default {
	/**
	 * @param {Request} request
	 * @returns {Promise<Response>}
	 */
	fetch(request) {
		// If this is an ISR request, the requested pathname is encoded
		// as a search parameter, so we need to extract it
		const url = new URL(request.url);
		let pathname = url.searchParams.get('__pathname');

		if (pathname) {
			// Optional routes' pathname replacements look like `/foo/$1/bar` which means we could end up with an url like /foo//bar
			pathname = pathname.replace(/\/+/g, '/');

			url.pathname = pathname + (url.pathname.endsWith(DATA_SUFFIX) ? DATA_SUFFIX : '');
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
