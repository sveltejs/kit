import { getRawBody } from '@sveltejs/kit/node';
import compression from 'compression';
import fs from 'fs';
import { dirname, join } from 'path';
import polka from 'polka';
import sirv from 'sirv';
import { fileURLToPath } from 'url';

// App is a dynamic file built from the application layer.

const __dirname = dirname(fileURLToPath(import.meta.url));
/** @type {import('polka').Middleware} */
const noop_handler = (_req, _res, next) => next();
const paths = {
	assets: join(__dirname, '/assets'),
	prerendered: join(__dirname, '/prerendered')
};

// TODO: type render function from @sveltejs/kit/adapter
// @ts-ignore
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
				setHeaders: (res, pathname) => {
					// @ts-expect-error - dynamically replaced with define
					if (pathname.startsWith(/* eslint-disable-line no-undef */ APP_DIR)) {
						res.setHeader('cache-control', 'public, max-age=31536000, immutable');
					}
				},
				gzip: true,
				brotli: true
		  })
		: noop_handler;

	const server = polka().use(
		// @ts-ignore TODO - compression return doesn't play well with polka.use
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
				if (rendered.body) res.write(rendered.body);
				res.end();
			} else {
				res.statusCode = 404;
				res.end('Not found');
			}
		}
	);

	return server;
}
