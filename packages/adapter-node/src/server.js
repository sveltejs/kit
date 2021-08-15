import { getRawBody } from '@sveltejs/kit/node'; // eslint-disable-line import/no-unresolved
import compression from 'compression';
import fs from 'fs';
import { dirname, join } from 'path';
import polka from 'polka';
import sirv from 'sirv';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import compressible from 'compressible';

// App is a dynamic file built from the application layer.

const __dirname = dirname(fileURLToPath(import.meta.url));
const noop_handler = (_req, _res, next) => next();
const paths = {
	assets: join(__dirname, '/assets'),
	prerendered: join(__dirname, '/prerendered')
};

export function createServer({ render }) {
	const prerendered_handler = fs.existsSync(paths.prerendered)
		? sirv(paths.prerendered, {
				etag: true,
				maxAge: 0,
				gzip: true,
				brotli: true
		  })
		: noop_handler;

	const assets_handler = fs.existsSync(paths.assets)
		? sirv(paths.assets, {
				setHeaders: (res, pathname, stats) => {
					// eslint-disable-next-line no-undef
					if (pathname.startsWith(APP_DIR)) {
						res.setHeader('cache-control', 'public, max-age=31536000, immutable');
					}
				},
				gzip: true,
				brotli: true
		  })
		: noop_handler;

	const server = polka().use(
		compression({ threshold: 0 }),
		assets_handler,
		prerendered_handler,
		async (req, res) => {
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
				if (
					rendered.body &&
					typeof rendered.body === 'object' &&
					typeof rendered.body[Symbol.asyncIterator] === 'function'
				) {
					const flush = compressible(rendered.headers['content-type']) ? res.flush : null;
					const data = Readable.from(rendered.body);
					data.on('error', () => res.end());
					if (flush) {
						data.on('data', () => flush());
					}
					data.pipe(res);
				} else {
					res.end(rendered.body);
				}
			} else {
				res.statusCode = 404;
				res.end('Not found');
			}
		}
	);

	return server;
}
