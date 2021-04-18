import { URL } from 'url';
// eslint-disable-next-line import/no-unresolved
import { get_body } from '@sveltejs/kit/http';
import fetch, { Response, Request, Headers } from 'node-fetch';

// provide server-side fetch
globalThis.fetch = fetch;
globalThis.Response = Response;
globalThis.Request = Request;
globalThis.Headers = Headers;

export default async (req, res) => {
	const { pathname, searchParams } = new URL(req.url || '', 'http://localhost');

	const { render } = await import('../output/server/app.js');

	const rendered = await render({
		method: req.method,
		headers: req.headers,
		path: pathname,
		query: searchParams,
		body: await get_body(req)
	});

	if (rendered) {
		const { status, headers, body } = rendered;
		return res.writeHead(status, headers).end(body);
	}

	return res.writeHead(404).end();
};
