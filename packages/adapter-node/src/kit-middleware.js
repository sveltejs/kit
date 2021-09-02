import { getRawBody } from '@sveltejs/kit/node';

/**
 * @param {import('@sveltejs/kit').App} app
 * @return {import('polka').Middleware}
 */
export function create_kit_middleware({ render }) {
	return async (req, res) => {
		const parsed = new URL(req.url || '', 'http://localhost');

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
			rawBody: body
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
