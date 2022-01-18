import { __fetch_polyfill } from '@sveltejs/kit/install-fetch';
import { getRequest } from '@sveltejs/kit/node';
import { App } from 'APP';
import { manifest } from 'MANIFEST';

__fetch_polyfill();

const app = /** @type {import('@sveltejs/kit').App} */ (new App(manifest));

export default async (req, res) => {
	let request;

	try {
		request = await getRequest(req, manifest);
	} catch (err) {
		res.statusCode = err.status || 400;
		return res.end(err.reason || 'Invalid request body');
	}

	const rendered = await app.render(request);

	res.writeHead(rendered.status, Object.fromEntries(rendered.headers));
	if (rendered.body) res.write(new Uint8Array(await rendered.arrayBuffer()));
	res.end();
};
