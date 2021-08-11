// TODO hardcoding the relative location makes this brittle
import { init, render } from '../output/server/app.js'; // eslint-disable-line import/no-unresolved
import { getAssetFromKV, NotFoundError } from '@cloudflare/kv-asset-handler'; // eslint-disable-line import/no-unresolved
import { isContentTypeTextual } from '@sveltejs/kit/adapter-utils'; // eslint-disable-line import/no-unresolved

init();

addEventListener('fetch', (event) => {
	event.respondWith(handle(event));
});

async function handle(event) {
	const { request } = event;
	// try static files first
	if (request.method == 'GET') {
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

	const parsedURL = new URL(request.url);
	const path = decodeURIComponent(parsedURL.pathname);
	const rawBody = request.body ? await read(request) : null;
	const headers = Object.fromEntries(request.headers);

	try {
		const rendered = await render({
			host: parsedURL.host,
			query: parsedURL.searchParams,
			method: request.method,
			path,
			rawBody,
			headers
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
	if (isContentTypeTextual(type)) {
		return request.text();
	}

	return new Uint8Array(await request.arrayBuffer());
}
