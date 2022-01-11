import { App } from 'APP';
import { manifest, prerendered } from './manifest.js';
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

const app = new App(manifest);

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
		const rendered = await app.render({
			url: request.url,
			rawBody: await read(request),
			headers: Object.fromEntries(request.headers),
			method: request.method
		});

		if (rendered) {
			return new Response(rendered.body, {
				status: rendered.status,
				headers: make_headers(rendered.headers)
			});
		}
	} catch (e) {
		return new Response('Error rendering route:' + (e.message || e.toString()), { status: 500 });
	}

	return new Response('Not Found', {
		status: 404,
		statusText: 'Not Found'
	});
}

/** @param {Request} request */
async function read(request) {
	return new Uint8Array(await request.arrayBuffer());
}

/** @param {Record<string, string | string[]>} headers */
function make_headers(headers) {
	const result = new Headers();
	for (const header in headers) {
		const value = headers[header];
		if (typeof value === 'string') {
			result.set(header, value);
			continue;
		}
		for (const sub of value) {
			result.append(header, sub);
		}
	}
	return result;
}
