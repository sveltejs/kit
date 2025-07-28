import { Server } from '@sveltejs/kit/internal/server';
// TODO: use prod variables when building
// TODO: fix kit virtual module type issues when this file is consumed by an app
import { version } from '__sveltekit/environment';
import {
	manifest,
	env,
	remote_address,
	base_path,
	prerendered
} from '__sveltekit/vite-environment';
import * as Cache from 'worktop/cfw.cache';

const app_path = `/${manifest.appPath}`;

// const immutable = `${app_path}/immutable/`;
const version_file = `${app_path}/version.json`;

const server = new Server(manifest);

await server.init({ env });

/**
 * @param {Request} request
 * @param {{ ASSETS: { fetch: typeof fetch } }} env
 * @param {import('@cloudflare/workers-types').ExecutionContext} ctx
 * @returns {Promise<Response>}
 */
export async function handleRequest(request, env, ctx) {
	// skip cache if "cache-control: no-cache" in request
	let pragma = request.headers.get('cache-control') || '';
	let res = !pragma.includes('no-cache') && (await Cache.lookup(request));
	if (res) return res;

	let { pathname, search } = new URL(request.url);
	try {
		pathname = decodeURIComponent(pathname);
	} catch {
		// ignore invalid URI
	}

	const stripped_pathname = pathname.replace(/\/$/, '');

	// files in /static, the service worker, and Vite imported server assets
	// let is_static_asset = false;
	// const filename = stripped_pathname.slice(base_path.length + 1);
	// if (filename) {
	// 	is_static_asset =
	// 		manifest.assets.has(filename) ||
	// 		manifest.assets.has(filename + '/index.html') ||
	// 		filename in manifest._.server_assets ||
	// 		filename + '/index.html' in manifest._.server_assets;
	// }

	let location = pathname.at(-1) === '/' ? stripped_pathname : pathname + '/';

	// TODO: we should only return the version var in dev because the version file is not written to disk
	if (pathname === version_file) {
		res = new Response(version);
	// } else if (
	// 	is_static_asset ||
	// 	prerendered.has(pathname) ||
	// 	pathname === version_file ||
	// 	pathname.startsWith(immutable)
	// ) {
	// // TODO: verify if the ASSETS can be used during development
	// 	res = await env.ASSETS.fetch(request);
	} else if (location && prerendered.has(location)) {
		// trailing slash redirect for prerendered pages
		if (search) location += search;
		res = new Response('', {
			status: 308,
			headers: {
				location
			}
		});
	} else {
		// dynamically-generated pages
		res = await server.respond(request, {
			platform: {
				env,
				ctx,
				context: ctx, // deprecated in favor of ctx
				// @ts-expect-error webworker types from worktop are not compatible with Cloudflare Workers types
				caches,
				// @ts-expect-error the type is correct but ts is confused because platform.cf uses the type from index.ts while req.cf uses the type from index.d.ts
				cf: request.cf
			},
			getClientAddress() {
				if (remote_address) return remote_address;
				throw new Error('Could not determine clientAddress');
				// TODO: use the header in prod
				// return request.headers.get('cf-connecting-ip');
			}
		});
	}

	// write to `Cache` only if response is not an error,
	// let `Cache.save` handle the Cache-Control and Vary headers
	pragma = res.headers.get('cache-control') || '';
	return pragma && res.status < 400 ? Cache.save(request, res, ctx) : res;
}
