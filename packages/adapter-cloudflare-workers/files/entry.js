// TODO hardcoding the relative location makes this brittle
import { init, render } from '../output/server/app.js';
import { getAssetFromKV, NotFoundError } from '@cloudflare/kv-asset-handler';

init();

addEventListener('fetch', (event) => {
	event.respondWith(handle(event));
});

async function handle(event) {
	// try static files first
	if (event.request.method == 'GET') {
		try {
			// TODO rather than attempting to get an asset,
			// use the asset manifest to see if it exists
			return await getAssetFromKV(event);
		} catch (e) {
			if (!(e instanceof NotFoundError)) {
				return new Response('Error loading static asset:' + (e.message || e.toString()), {
					status: 500
				});
			}
		}
	}

	// fall back to an app route
	const request = event.request;
	const request_url = new URL(request.url);

	try {
		const rendered = await render({
			host: request_url.host,
			path: request_url.pathname,
			query: request_url.searchParams,
			rawBody: await read(request),
			headers: Object.fromEntries(request.headers),
			method: request.method
		});

		if (rendered) {
			return new Response(rendered.body, {
				status: rendered.status,
				headers: makeHeaders(rendered.headers)
			});
		}
	} catch (e) {
		return new Response('Error rendering route:' + (e.message || e.toString()), { status: 500 });
	}

	return new Response({
		status: 404,
		statusText: 'Not Found'
	});
}

/** @param {Request} request */
async function read(request) {
	return new Uint8Array(await request.arrayBuffer());
}

/**
 * @param {Record<string, string | string[]>} headers
 * @returns {Request}
 */
function makeHeaders(headers) {
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
