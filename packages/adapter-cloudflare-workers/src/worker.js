import { Server } from 'SERVER';
import { manifest, prerendered, base_path } from 'MANIFEST';
import * as Cache from 'worktop/cfw.cache';

const server = new Server(manifest);

const app_path = `/${manifest.appPath}`;

const immutable = `${app_path}/immutable/`;

export default {
	/**
	 * @param {Request} req
	 * @param {{ ASSETS: { fetch: typeof fetch } }} env
	 * @param {ExecutionContext} context
	 * @returns {Promise<Response>}
	 */
	async fetch(req, env, context) {
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

		// immutable assets and version.json
		if (pathname.startsWith(app_path)) {
			res = await env.ASSETS.fetch(req);
			if (is_error(res.status)) return res;

			const cache_control = pathname.startsWith(immutable)
				? 'public, immutable, max-age=31536000'
				: 'no-cache';

			res.headers.set('cache-control', cache_control);
		} else {
			const stripped_pathname = pathname.replace(/\/$/, '');

			// /static files, the service worker, and Vite imported server assets
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

			if (is_static_asset || prerendered.has(pathname)) {
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
						context,
						// @ts-expect-error webworker types from worktop are not compatible with Cloudflare Workers types
						caches,
						cf: req.cf
					},
					getClientAddress() {
						return req.headers.get('cf-connecting-ip');
					}
				});
			}
		}

		// write to `Cache` only if response is not an error,
		// let `Cache.save` handle the Cache-Control and Vary headers
		pragma = res.headers.get('cache-control') || '';
		return pragma && !is_error(res.status) ? Cache.save(req, res, context) : res;
	}
};

/**
 * @param {number} status
 * @returns {boolean}
 */
function is_error(status) {
	return status > 399;
}
