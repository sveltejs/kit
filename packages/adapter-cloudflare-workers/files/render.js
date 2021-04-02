import { render } from './app.js'; // eslint-disable-line import/no-unresolved
import { getAssetFromKV, NotFoundError } from '@cloudflare/kv-asset-handler'; // eslint-disable-line import/no-unresolved

// From https://developers.cloudflare.com/workers/examples/read-post
async function readRequestBody(request) {
	const { headers } = request;
	const contentType = headers.get('content-type') || '';
	if (contentType.includes('application/json')) {
		return JSON.stringify(await request.json());
	} else if (contentType.includes('application/text')) {
		return await request.text();
	} else if (contentType.includes('text/html')) {
		return await request.text();
	} else if (contentType.includes('form')) {
		return await request.formData();
	} else {
		const myBlob = await request.blob();
		const objectURL = URL.createObjectURL(myBlob);
		return objectURL;
	}
}

addEventListener('fetch', (event) => {
	event.respondWith(handleEvent(event));
});

async function handleEvent(event) {
	//try static files first
	if (event.request.method == 'GET') {
		try {
			return await getAssetFromKV(event);
		} catch (e) {
			if (!(e instanceof NotFoundError)) {
				return new Response('Error loading static asset:' + (e.message || e.toString()), {
					status: 500
				});
			}
		}
	}

	//fall back to an app route
	const request = event.request;
	const request_url = new URL(request.url);

	try {
		const rendered = await render({
			host: request_url.host,
			path: request_url.pathname,
			query: request_url.searchParams,
			body: request.body ? await readRequestBody(request) : null,
			headers: request.headers,
			method: request.method
		});

		if (rendered) {
			const response = new Response(rendered.body, {
				status: rendered.status,
				headers: rendered.headers
			});
			return response;
		}
	} catch (e) {
		return new Response('Error rendering route:' + (e.message || e.toString()), { status: 500 });
	}

	return new Response({
		status: 404,
		statusText: 'Not Found'
	});
}
