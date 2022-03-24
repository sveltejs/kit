import { Server } from 'SERVER';
import { manifest, prerendered } from 'MANIFEST';

const server = new Server(manifest);

const prefix = `/${manifest.appDir}/`;

export default {
	/**
	 * @param {Request} req
	 * @param {any} env
	 * @param {any} context
	 */
	async fetch(req, env, context) {
		const url = new URL(req.url);

		// static assets
		if (url.pathname.startsWith(prefix)) {
			/** @type {Response} */
			const res = await env.ASSETS.fetch(req);

			return new Response(res.body, {
				headers: {
					// include original cache headers, minus cache-control which
					// is overridden, and etag which is no longer useful
					'cache-control': 'public, immutable, max-age=31536000',
					'content-type': res.headers.get('content-type'),
					'x-robots-tag': 'noindex'
				}
			});
		}

		// prerendered pages and index.html files
		const pathname = url.pathname.replace(/\/$/, '');
		let file = pathname.substring(1);

		try {
			file = decodeURIComponent(file);
		} catch (err) {
			// ignore
		}

		if (
			manifest.assets.has(file) ||
			manifest.assets.has(file + '/index.html') ||
			prerendered.has(pathname || '/')
		) {
			return env.ASSETS.fetch(req);
		}

		// dynamically-generated pages
		try {
			// @ts-expect-error - `default` exists only in the cloudflare workers environment
			const cache = caches.default;
			let response = await cache.match(req);

			if (!response) {
				response = await server.respond(req, {
					platform: { env, context },
					getClientAddress() {
						return req.headers.get('cf-connecting-ip');
					}
				});

				// Use waitUntil so you can return the response without blocking on
				// writing to cache
				try {
					// If cookies are being set, ensure we dont cache the page.
					if (response.headers.has('Set-Cookie')) {
						response = new Response(response.body, response);
						response.headers.append('Cache-Control', 'private=Set-Cookie');
					}

					context.waitUntil(cache.put(req, response.clone()));
				} catch {
					// noop
				}
			}

			return response;
		} catch (e) {
			return new Response('Error rendering route: ' + (e.message || e.toString()), { status: 500 });
		}
	}
};
