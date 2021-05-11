import '@sveltejs/kit/install-fetch'; // eslint-disable-line import/no-unresolved
import { getRawBody } from '@sveltejs/kit/node'; // eslint-disable-line import/no-unresolved
import compression from 'compression';
import fs from 'fs';
import { dirname, join } from 'path';
import polka from 'polka';
import sirv from 'sirv';
import { fileURLToPath } from 'url';

// App is a dynamic file built from the application layer.

const __dirname = dirname(fileURLToPath(import.meta.url));
const noop_handler = (_req, _res, next) => next();
const paths = {
	assets: join(__dirname, '/assets'),
	static: join(__dirname, '/static'),
	prerendered: join(__dirname, '/prerendered')
};

export function createServer({ render }) {
	const mutable = (dir) =>
		sirv(dir, {
			etag: true,
			maxAge: 0
		});

	const prerendered_handler = fs.existsSync(paths.prerendered)
		? mutable(paths.prerendered)
		: noop_handler;

	const static_handler = fs.existsSync(paths.static)
		? sirv(paths.static, {
				maxAge: 3600
		  })
		: noop_handler;

	const assets_handler = fs.existsSync(paths.assets)
		? sirv(paths.assets, {
				maxAge: 31536000,
				immutable: true
		  })
		: noop_handler;

	const server = polka().use(
		compression({ threshold: 0 }),
		assets_handler,
		static_handler,
		prerendered_handler,
		async (req, res) => {
			const parsed = new URL(req.url || '', 'http://localhost');
			const rendered = await render({
				method: req.method,
				headers: req.headers, // TODO: what about repeated headers, i.e. string[]
				path: parsed.pathname,
				rawBody: await getRawBody(req),
				query: parsed.searchParams
			});

			if (rendered) {
				res.writeHead(rendered.status, rendered.headers);
				res.end(rendered.body);
			} else {
				res.statusCode = 404;
				res.end('Not found');
			}
		}
	);

	return server;
}
