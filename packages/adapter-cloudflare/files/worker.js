/* global ASSETS */
import { App } from '../output/server/app.js';
import { manifest } from '../output/server/manifest.js';

const app = new App(manifest);

export default {
	async fetch(req, env) {
		const url = new URL(req.url);

		// check generated asset_set for static files
		if (ASSETS.has(url.pathname.substring(1))) {
			return env.ASSETS.fetch(req);
		}

		try {
			const rendered = await app.render({
				path: url.pathname,
				query: url.searchParams,
				rawBody: await read(req),
				headers: Object.fromEntries(req.headers),
				method: req.method
			});

			if (rendered) {
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
