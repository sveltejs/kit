/* global GENERATE_NONCES */
import { getRawBody } from '@sveltejs/kit/node';
import { randomBytes } from 'crypto';

// TODO hardcoding the relative location makes this brittle
import { init, render } from '../output/server/app.js';

init();

export default async (req, res) => {
	const { pathname, searchParams } = new URL(req.url || '', 'http://localhost');

	let body;

	try {
		body = await getRawBody(req);
	} catch (err) {
		res.statusCode = err.status || 400;
		return res.end(err.reason || 'Invalid request body');
	}

	const rendered = await render({
		method: req.method,
		headers: req.headers,
		path: pathname,
		query: searchParams,
		rawBody: body,
		nonce: GENERATE_NONCES && randomBytes(16).toString('hex')
	});

	if (rendered) {
		const { status, headers, body } = rendered;
		return res.writeHead(status, headers).end(body);
	}

	return res.writeHead(404).end();
};
