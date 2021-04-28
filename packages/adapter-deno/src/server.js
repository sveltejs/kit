import { app, dirname, existsSync, fromFileUrl, join, serveStatic } from './deps.ts';
import { getRawBody, headers_to_object } from './http.js';

// App is a dynamic file built from the application layer.

const __dirname = dirname(fromFileUrl(import.meta.url));
const noop_handler = (_req, _res, next) => next();
const paths = {
	assets: join(__dirname, '/assets'),
	prerendered: join(__dirname, '/prerendered')
};

export function createServer({ render }) {
	const mutable = (dir) =>
		serveStatic(dir, {
			etag: true,
			maxAge: 0
		});

	const prerendered_handler = existsSync(paths.prerendered)
		? mutable(paths.prerendered)
		: noop_handler;

	const assets_handler = existsSync(paths.assets)
		? serveStatic(paths.assets, {
				maxAge: 31536000,
				immutable: true
		  })
		: noop_handler;

	const server = app().use(
		// TODO: handle response compression
		// compression({ threshold: 0 }),
		assets_handler,
		prerendered_handler,
		async (req, res) => {
			const parsed = new URL(req.url || '', 'http://localhost');
			const rendered = await render({
				method: req.method,
				headers: headers_to_object(req.headers), // TODO: what about repeated headers, i.e. string[]
				path: parsed.pathname,
				rawBody: await getRawBody(req),
				query: parsed.searchParams
			});

			if (rendered) {
				res.setStatus(rendered.status);
				res.set(rendered.headers);
				res.send(rendered.body);
			} else {
				res.setStatus(404);
				res.send('Not found');
			}
		}
	);

	return server;
}
