import { createReadableStream } from '@sveltejs/kit/node';
import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';
import process from 'node:process';

const server = new Server(manifest);

await server.init({
	env: process.env,
	read: createReadableStream
});

const DATA_SUFFIX = '/__data.json';

export default {
	/**
	 * @param {Request} request
	 * @returns {Promise<Response>}
	 */
	async fetch(request) {
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

		const respond = () =>
			server.respond(request, {
				getClientAddress() {
					return /** @type {string} */ (request.headers.get('x-forwarded-for'));
				}
			});

		let response = await respond();

		if (response.headers.has('x-sveltekit-normalize')) {
			const location = response.headers.get('location');

			if (location) {
				const url = new URL(location, request.url);

				if (pathname) {
					request = new Request(url, request);
					response = await respond();
				} else {
					response.headers.set('location', url.pathname + url.search + url.hash);
				}
			}
		}

		return response;
	}
};
