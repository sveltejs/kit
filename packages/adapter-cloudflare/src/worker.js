import { Server } from 'SERVER';
import { manifest, prerendered, base_path } from 'MANIFEST';
import * as Cache from 'worktop/cfw.cache';

const server = new Server(manifest);

const app_path = `/${manifest.appPath}`;

const immutable = `${app_path}/immutable/`;
const version_file = `${app_path}/version.json`;

export default {
	/**
	 * @param {Request} req
	 * @param {{ ASSETS: { fetch: typeof fetch } }} env
	 * @param {ExecutionContext} ctx
	 * @returns {Promise<Response>}
	 */
	async fetch(req, env, ctx) {
		await server.init({
			// @ts-expect-error env contains environment variables and bindings
			env
		});

		// skip cache if "cache-control: no-cache" in request
		let pragma = req.headers.get('cache-control') || '';
		let res = !pragma.includes('no-cache') && (await Cache.lookup(req));
		if (res) return res;

		let { pathname, search } = new URL(req.url);
		try {
			pathname = decodeURIComponent(pathname);
		} catch {
			// ignore invalid URI
		}

		const stripped_pathname = pathname.replace(/\/$/, '');

		// files in /static, the service worker, and Vite imported server assets
		let is_static_asset = false;
		const filename = stripped_pathname.slice(base_path.length + 1);
		if (filename) {
			is_static_asset =
				manifest.assets.has(filename) ||
				manifest.assets.has(filename + '/index.html') ||
				filename in manifest._.server_assets ||
				filename + '/index.html' in manifest._.server_assets;
		}

		let location = pathname.at(-1) === '/' ? stripped_pathname : pathname + '/';

		if (
			is_static_asset ||
			prerendered.has(pathname) ||
			pathname === version_file ||
			pathname.startsWith(immutable)
		) {
			res = await env.ASSETS.fetch(req);
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
			res = await server.respond(req, {
				platform: {
					env,
					ctx,
					context: ctx, // deprecated in favor of ctx
					// @ts-expect-error webworker types from worktop are not compatible with Cloudflare Workers types
					caches,
					// @ts-expect-error the type is correct but ts is confused because platform.cf uses the type from index.ts while req.cf uses the type from index.d.ts
					cf: req.cf
				},
				getClientAddress() {
					return req.headers.get('cf-connecting-ip');
				}
			});
		}

		// write to `Cache` only if response is not an error,
		// let `Cache.save` handle the Cache-Control and Vary headers
		pragma = res.headers.get('cache-control') || '';
		return pragma && res.status < 400 ? Cache.save(req, res, ctx) : res;
	}
};
