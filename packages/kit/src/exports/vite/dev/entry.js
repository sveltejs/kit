/** @import { InternalServer, ValidatedKitConfig } from 'types' */

import fs from 'node:fs';
import path from 'node:path';
import { Server } from 'sveltekit:server';
import { env, manifest } from 'sveltekit:server-manifest';
import { createReadableStream } from '@sveltejs/kit/node';
import { from_fs } from '../filesystem.js';

/** @type {InternalServer} */
const server = new Server(manifest);

await server.init({
	env,
	read: (file) => createReadableStream(from_fs(file))
});

/**
 * @param {Request} request
 * @param {string | undefined} remote_address
 * @param {ValidatedKitConfig} kit
 * @returns {Promise<Response>}
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
