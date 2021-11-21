/* global ASSETS */
import { init, render } from '../output/server/app.js';

init();

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		// check generated asset_set for static files
		if (ASSETS.has(url.pathname.substring(1))) {
			return env.ASSETS.fetch(request);
		}

		try {
			const rendered = await render({
				host: url.host || '',
				path: url.pathname || '',
				query: url.searchParams || '',
				rawBody: await read(request),
				headers: Object.fromEntries(request.headers),
				method: request.method,
				adapter: { request, env, ctx }
			});

			if (rendered) {
				if (rendered.adapter) {
					return rendered.adapter.response;
				}

				return new Response(rendered.body, {
					status: rendered.status,
					headers: makeHeaders(rendered.headers)
				});
			}
		} catch (e) {
			return new Response('Error rendering route: ' + (e.message || e.toString()), { status: 500 });
		}

		return new Response({
			status: 404,
			statusText: 'Not Found'
		});
	}
};

async function read(request) {
	return new Uint8Array(await request.arrayBuffer());
}

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
