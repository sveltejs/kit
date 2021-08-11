import { getRawBody } from '@sveltejs/kit/node'; // eslint-disable-line import/no-unresolved

// TODO hardcoding the relative location makes this brittle
import { init, render } from '../output/server/app.js'; // eslint-disable-line import/no-unresolved

init();

export default async (req, res) => {
	const query = new URLSearchParams(req.query);
	let rawBody;

	try {
		rawBody = await getRawBody(req);
	} catch (err) {
		res.statusCode = err.status || 400;
		return res.end(err.reason || 'Invalid request body');
	}

	const rendered = await render({
		method: req.method,
		headers: req.headers,
		path: req.path,
		query,
		rawBody
	});

	if (rendered) {
		const { status, headers, body } = rendered;
		return res.writeHead(status, headers).end(body);
	}

	return res.writeHead(404).end();
};
