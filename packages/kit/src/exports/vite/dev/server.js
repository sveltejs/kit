import fs from 'node:fs';
import path from 'node:path';
import { Server } from '__sveltekit/server';
import { env, manifest } from '__sveltekit/ssr-manifest';
import { createReadableStream } from '@sveltejs/kit/node';
import { from_fs } from '../filesystem.js';

const server = new Server(manifest);

await server.init({
	env,
	read: (file) => createReadableStream(from_fs(file))
});

/**
 *
 * @param {Request} request
 * @param {string | undefined} remote_address
 * @param {import('types').ValidatedKitConfig} kit
 * @returns
 */
export async function respond(request, remote_address, kit) {
	return await server.respond(request, {
		getClientAddress: () => {
			if (remote_address) return remote_address;
			throw new Error('Could not determine clientAddress');
		},
		read: (file) => {
			if (file in manifest._.server_assets) {
				return fs.readFileSync(from_fs(file));
			}

			return fs.readFileSync(path.join(kit.files.assets, file));
		}
	});
}

import.meta.hot?.accept();
