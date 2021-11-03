import { getRawBody } from '@sveltejs/kit/node';
import { randomBytes } from 'crypto';

/**
 * @return {import('polka').Middleware}
 */
// TODO: type render function from @sveltejs/kit/adapter
// @ts-ignore
export function create_kit_middleware({ render }) {
	return async (req, res) => {
		let parsed;
		try {
			parsed = new URL(req.url || '', 'http://localhost');
		} catch (e) {
			res.statusCode = 400;
			return res.end('Invalid URL');
		}

		let body;

		try {
			body = await getRawBody(req);
		} catch (err) {
			res.statusCode = err.status || 400;
			return res.end(err.reason || 'Invalid request body');
		}

		const rendered = await render({
			method: req.method,
			headers: req.headers, // TODO: what about repeated headers, i.e. string[]
			path: parsed.pathname,
			query: parsed.searchParams,
			rawBody: body,
			nonce:
				// @ts-ignore
				/* eslint-disable-line no-undef */ GENERATE_NONCES && randomBytes(16).toString('base64')
		});

		if (rendered) {
			res.writeHead(rendered.status, rendered.headers);
			if (rendered.body) {
				res.write(rendered.body);
			}
			res.end();
		} else {
			res.statusCode = 404;
			res.end('Not found');
		}
	};
}
