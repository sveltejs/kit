import { Server } from 'SERVER';
import { manifest, prerendered } from 'MANIFEST';
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

const server = new Server(manifest);

const prefix = `/${manifest.appDir}/`;

addEventListener('fetch', (/** @type {FetchEvent} */ event) => {
	event.respondWith(handle(event));
});

/**
 * @param {FetchEvent} event
 * @returns {Promise<Response>}
 */
async function handle(event) {
	const { request } = event;

	const url = new URL(request.url);

	// generated assets
	if (url.pathname.startsWith(prefix)) {
		const res = await getAssetFromKV(event);
		return new Response(res.body, {
			headers: {
				'cache-control': 'public, immutable, max-age=31536000',
				'content-type': res.headers.get('content-type')
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
		return await getAssetFromKV(event);
	}

	// dynamically-generated pages
	try {
		return await server.respond(request, {
			getClientAddress() {
				return request.headers.get('cf-connecting-ip');
			}
		});
	} catch (e) {
		return new Response('Error rendering route:' + (e.message || e.toString()), { status: 500 });
	}
}
