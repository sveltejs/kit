import { createReadableStream } from '@sveltejs/kit/node';
import process from 'node:process';

/**
 * @param {import('@sveltejs/kit').Server} server
 * @returns {(request: Request, context: import('@netlify/types').Context) => Promise<Response>}
 */
export function init(server) {
	/** @type {Promise<void> | null} */
	let init_promise = server.init({
		env: process.env,
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
