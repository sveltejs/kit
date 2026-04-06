import { Server } from 'virtual:@sveltejs/kit/vite/environment/server';
import { env, manifest } from 'virtual:@sveltejs/kit/vite/environment';
import { createReadableStream } from '@sveltejs/kit/node';
import { from_fs } from '../filesystem.js';

const server = new Server(manifest);

await server.init({
	env,
	read: (file) => createReadableStream(from_fs(file))
});

/**
 * @param {Request} request
 * @param {string | undefined} remote_address
 * @returns {Promise<Response>}
 */
export async function respond(request, remote_address) {
	return await server.respond(request, {
		getClientAddress: () => {
			if (remote_address) return remote_address;
			throw new Error('Could not determine clientAddress');
		}
	});
}

import.meta.hot?.accept();
