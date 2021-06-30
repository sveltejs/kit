// TODO hardcoding the relative location makes this brittle
import { render } from '../output/server/app.js'; // eslint-disable-line import/no-unresolved
import { getAssetFromKV, NotFoundError } from '@cloudflare/kv-asset-handler'; // eslint-disable-line import/no-unresolved

addEventListener('fetch', (event) => {
	event.respondWith(handle(event));
});

async function handle(event) {
	// fall back to an app route
	const request = event.request;
	const request_url = new URL(request.url);

	// try static files first
	if (event.request.method == 'GET' && /\/.+\..+$/.test(request_url.pathname)) {
		try {
			// TODO add per-asset/page options for cache
			// use defaults for bot files (2d edge cache)
			if (/sitemap.*\.xml$|robots.txt$/.test(request_url.pathname)) {
				return await getAssetFromKV(event);
			}
			// TODO rather than attempting to get an asset,
			// use the asset manifest to see if it exists
			return await getAssetFromKV(event, {
				cacheControl: {
					// eslint-disable-next-line no-undef
					browserTTL: STATIC_CACHE_TTL,
					// eslint-disable-next-line no-undef
					edgeTTL: EDGE_CACHE_TTL
				}
			});
		} catch (e) {
			if (!(e instanceof NotFoundError)) {
				return new Response('Error loading static asset:' + (e.message || e.toString()), {
					status: 500
				});
			}
		}
	}

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
			const { headers } = rendered;
			// inject cache-control header
			// eslint-disable-next-line no-undef
			if (!!PAGE_CACHE_TTL && !(headers['Cache-Control'] || headers['cache-control'])) {
				// eslint-disable-next-line no-undef
				rendered.headers['cache-control'] = `max-age=${PAGE_CACHE_TTL}`;
			}
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
	if (type.includes('application/octet-stream')) {
		return new Uint8Array(await request.arrayBuffer());
	}

	return request.text();
}
