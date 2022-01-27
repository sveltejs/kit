import { App } from 'APP';
import { manifest, prerendered } from 'MANIFEST';

const app = new App(manifest);

const prefix = `/${manifest.appDir}/`;

export default {
	async fetch(req, env) {
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
			return await app.render(req, { platform: { env } });
		} catch (e) {
			return new Response('Error rendering route: ' + (e.message || e.toString()), { status: 500 });
		}
	}
};
