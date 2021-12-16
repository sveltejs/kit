import { getRawBody } from '@sveltejs/kit/node';
import { Readable } from 'stream';
import compressible from 'compressible';

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
			rawBody: body
		});

		if (rendered) {
			res.writeHead(rendered.status, rendered.headers);
			if (
				rendered.body &&
				typeof rendered.body === 'object' &&
				typeof rendered.body[Symbol.asyncIterator] === 'function'
			) {
				const flush =
					rendered.headers && compressible(rendered.headers['content-type']) ? res.flush : null;
				const data = Readable.from(rendered.body);
				data.on('error', () => res.end());
				if (flush) {
					data.on('data', () => flush());
				}
				res.on('close', () => data.destroy());
				data.pipe(res);
			} else {
				res.end(rendered.body);
			}
		} else {
			res.statusCode = 404;
			res.end('Not found');
		}
	};
}
