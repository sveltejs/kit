import { __fetch_polyfill } from '@sveltejs/kit/install-fetch';
import { getRawBody } from '@sveltejs/kit/node';
import { App } from 'APP';
import { manifest } from 'MANIFEST';

__fetch_polyfill();

const app = /** @type {import('@sveltejs/kit').App} */ (new App(manifest));

export default async (req, res) => {
	let rawBody;

	try {
		rawBody = await getRawBody(req);
	} catch (err) {
		res.statusCode = err.status || 400;
		return res.end(err.reason || 'Invalid request body');
	}

	const rendered = await app.render({
		url: req.url,
		method: req.method,
		headers: req.headers,
		rawBody
	});

	res.writeHead(rendered.status, Object.fromEntries(rendered.headers));
	res.end(await rendered.arrayBuffer());
};
