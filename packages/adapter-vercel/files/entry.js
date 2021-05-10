import { getRawBody } from '@sveltejs/kit/node'; // eslint-disable-line import/no-unresolved
import '@sveltejs/kit/install-fetch'; // eslint-disable-line import/no-unresolved

// TODO hardcoding the relative location makes this brittle
import { render } from '../output/server/app.js'; // eslint-disable-line import/no-unresolved

export default async (req, res) => {
	const { pathname, searchParams } = new URL(req.url || '', 'http://localhost');

	const rendered = await render({
		method: req.method,
		headers: req.headers,
		path: pathname,
		query: searchParams,
		rawBody: await getRawBody(req)
	});

	if (rendered) {
		const { status, headers, body } = rendered;
		return res.writeHead(status, headers).end(body);
	}

	return res.writeHead(404).end();
};
