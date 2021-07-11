// TODO hardcoding the relative location makes this brittle
import { init, render } from '../output/server/app.js'; // eslint-disable-line import/no-unresolved
import { getAssetFromKV, NotFoundError } from '@cloudflare/kv-asset-handler'; // eslint-disable-line import/no-unresolved
import { get_body_type } from '@sveltejs/kit/utils'; // eslint-disable-line import/no-unresolved

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
			rawBody: request.body ? await read(request) : null,
			headers: Object.fromEntries(request.headers),
			method: request.method
		});

		if (rendered) {
			return new Response(rendered.body, {
				status: rendered.status,
				headers: rendered.headers
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
	const type = request.headers.get('content-type') || '';
	if (get_body_type(type) === 'buffer') {
		return new Uint8Array(await request.arrayBuffer());
	}
	return request.text();
}
