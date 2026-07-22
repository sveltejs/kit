/** @import { InternalServer } from 'types' */
import fs from 'node:fs';
import path from 'node:path';
import { env } from 'sveltekit:env';
import { Server } from 'sveltekit:server';
import { manifest } from 'sveltekit:server-manifest';
import { createReadableStream } from '@sveltejs/kit/node';
import { from_fs } from '../../../utils/vite.js';

/** @type {InternalServer} */
const server = new Server(manifest);

await server.init({
	env,
	read: (file) => createReadableStream(file)
});

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function fetch(request) {
	/** @type {string | undefined} */
	let remote_address;

	if (request.headers.has('x-sveltekit-remote-address')) {
		remote_address = request.headers.get('x-sveltekit-remote-address') ?? undefined;
		request.headers.delete('x-sveltekit-remote-address');
	}

	return await server.respond(request, {
		getClientAddress: () => {
			if (remote_address) return remote_address;
			throw new Error('Could not determine clientAddress');
		},
		read: (file) => {
			if (file in manifest._.server_assets) {
				return fs.readFileSync(from_fs(file));
			}

			return fs.readFileSync(path.join(__SVELTEKIT_FILES_ASSETS__, file));
		}
	});
}

import.meta.hot?.accept();
