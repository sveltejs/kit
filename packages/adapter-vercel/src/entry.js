import { URL } from 'url';
// eslint-disable-next-line import/no-unresolved
import { get_body } from '@sveltejs/kit/http';

export default async (req, res) => {
	const host = `${req.headers['x-forwarded-proto']}://${req.headers.host}`;
	const { pathname, searchParams } = new URL(req.url || '', host);

	const { render } = await import('./server/app.mjs');

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
