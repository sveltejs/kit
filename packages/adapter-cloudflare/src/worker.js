import { Server } from 'SERVER';
import { manifest, prerendered } from 'MANIFEST';
import * as Cache from 'worktop/cfw.cache';

const server = new Server(manifest);

const prefix = `/${manifest.appDir}/`;

/** @type {import('worktop/cfw').Module.Worker<{ ASSETS: import('worktop/cfw.durable').Durable.Object }>} */
const worker = {
	async fetch(req, env, context) {
		// skip cache if "cache-control: no-cache" in request
		let pragma = req.headers.get('cache-control') || '';
		let res = !pragma.includes('no-cache') && (await Cache.lookup(req));
		if (res) return res;

		let { pathname } = new URL(req.url);

		// static assets
		if (pathname.startsWith(prefix)) {
			res = await env.ASSETS.fetch(req);

			res = new Response(res.body, {
				headers: {
					// include original cache headers, minus cache-control which
					// is overridden, and etag which is no longer useful
					'cache-control': 'public, immutable, max-age=31536000',
					'content-type': res.headers.get('content-type'),
					'x-robots-tag': 'noindex'
				}
			});
		} else {
			// prerendered pages and index.html files
			pathname = pathname.replace(/\/$/, '') || '/';

			let file = pathname.substring(1);

			try {
				file = decodeURIComponent(file);
			} catch (err) {
				// ignore
			}

			if (
				manifest.assets.has(file) ||
				manifest.assets.has(file + '/index.html') ||
				prerendered.has(pathname)
			) {
				res = await env.ASSETS.fetch(req);
			} else {
				// dynamically-generated pages
				res = await server.respond(req, {
					platform: { env, context },
					getClientAddress() {
						return req.headers.get('cf-connecting-ip');
					}
				});
			}
		}

		// Writes to Cache only if allowed & specified
		pragma = res.headers.get('cache-control');
		return pragma ? Cache.save(req, res, context) : res;
	}
};

export default worker;
