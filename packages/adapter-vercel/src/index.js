import { URL, URLSearchParams } from 'url';
import { get_body } from '@sveltejs/app-utils/http';

export default async (req, res) => {
	const { pathname, query = '' } = new URL(req.url || '', req.host);

	const { default: app } = await import('./server/app.js');

	const rendered = await app.render({
		method: req.method,
		headers: req.headers,
		path: pathname,
		query: new URLSearchParams(query),
		body: await get_body(req)
	});

	if (rendered) {
		const { status, headers, body } = rendered;
		return res.writeHead(status, headers).end(body);
	}

	return res.writeHead(404).end();
};
