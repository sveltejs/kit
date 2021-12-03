import { App } from '../output/server/app.js';
import { manifest, prerendered } from './manifest.js';

const app = new App(manifest);

const prefix = `/${manifest.appDir}/`;

export default {
	async fetch(req, env) {
		const url = new URL(req.url);
		const file = url.pathname.substring(1);

		if (url.pathname.startsWith(prefix) || manifest.assets.has(file)) {
			return env.ASSETS.fetch(req);
		}

		if (prerendered.has(url.pathname) || manifest.assets.has(file + '/index.html')) {
			return env.ASSETS.fetch(new Request(req.url + '/index.html', req));
		}

		try {
			const rendered = await app.render({
				path: url.pathname,
				query: url.searchParams,
				rawBody: new Uint8Array(await req.arrayBuffer()),
				headers: Object.fromEntries(req.headers),
				method: req.method
			});

			if (rendered) {
				return new Response(rendered.body, {
					status: rendered.status,
					headers: make_headers(rendered.headers)
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
