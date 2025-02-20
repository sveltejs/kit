import { Server } from 'SERVER';
import { manifest, prerendered, base_path } from 'MANIFEST';
import { onRequest } from 'MIDDLEWARE';
import * as Cache from 'worktop/cfw.cache';

const server = new Server(manifest);

const app_path = `/${manifest.appPath}`;

const immutable = `${app_path}/immutable/`;
const version_file = `${app_path}/version.json`;

/** @type {import('worktop/cfw').Module.Worker<{ ASSETS: import('worktop/cfw.durable').Durable.Object }>} */
const worker = {
	async fetch(request, env, context) {
		// @ts-ignore
		await server.init({ env });
		// skip cache if "cache-control: no-cache" in request
		let pragma = request.headers.get('cache-control') || '';
		let response = !pragma.includes('no-cache') && (await Cache.lookup(request));
		if (response) return response;

		/**
		 * @param {Request | string} input
		 * @param {RequestInit} init
		 */
		const next = async (input, init) => {
			/** @type {Request} */
			let req;

			if (!input && !init) {
				req = request;
			} else if (input instanceof Request) {
				req = input;
			} else {
				req = new Request(input, init);
			}

			return inner_fetch(request, env, context);
		};

		response = await onRequest({ ...context, request, env, next });

		// write to `Cache` only if response is not an error,
		// let `Cache.save` handle the Cache-Control and Vary headers
		pragma = response.headers.get('cache-control') || '';
		return pragma && response.status < 400 ? Cache.save(request, response, context) : response;
	}
};

/** @type {import('worktop/cfw').Module.Worker<{ ASSETS: import('worktop/cfw.durable').Durable.Object }>['fetch']} */
async function inner_fetch(request, env, context) {
	let { pathname, search } = new URL(request.url);
	try {
		pathname = decodeURIComponent(pathname);
	} catch {
		// ignore invalid URI
	}

	const stripped_pathname = pathname.replace(/\/$/, '');

	// prerendered pages and /static files
	let is_static_asset = false;
	const filename = stripped_pathname.slice(base_path.length + 1);
	if (filename) {
		is_static_asset =
			manifest.assets.has(filename) ||
			manifest.assets.has(filename + '/index.html') ||
			filename in manifest._.server_assets ||
			filename + '/index.html' in manifest._.server_assets;
	}

	/** @type {Response} */
	let response;
	let location = pathname.at(-1) === '/' ? stripped_pathname : pathname + '/';

	if (
		is_static_asset ||
		prerendered.has(pathname) ||
		pathname === version_file ||
		pathname.startsWith(immutable)
	) {
		response = await env.ASSETS.fetch(request);
	} else if (location && prerendered.has(location)) {
		if (search) location += search;
		response = new Response('', {
			status: 308,
			headers: {
				location
			}
		});
	} else {
		// dynamically-generated pages
		response = await server.respond(request, {
			// @ts-ignore
			platform: { env, context, caches, cf: request.cf },
			getClientAddress() {
				return request.headers.get('cf-connecting-ip');
			}
		});
	}

	return response;
}

export default worker;
