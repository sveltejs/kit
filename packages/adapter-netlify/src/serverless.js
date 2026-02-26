import './shims';
import { Server } from '0SERVER';
import { createReadableStream } from '@sveltejs/kit/node';
import process from 'node:process';

/**
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 * @returns {(request: Request, context: import('@netlify/functions').Context) => Promise<Response>}
 */
export function init(manifest) {
	const server = new Server(manifest);

	/** @type {Promise<void> | null} */
	let init_promise = server.init({
		env: /** @type {Record<string, string>} */ (process.env),
		read: (file) => createReadableStream(`.netlify/server/${file}`)
	});

	return async (request, context) => {
		if (init_promise !== null) {
			await init_promise;
			init_promise = null;
		}

		return server.respond(request, {
			platform: { context },
			getClientAddress() {
				return context.ip;
			}
		});
	};
}
