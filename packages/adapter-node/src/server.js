import compression from 'compression';
import fs from 'fs';
import polka from 'polka';
import { dirname, join } from 'path';
import sirv from 'sirv';
import { parse, URLSearchParams, fileURLToPath } from 'url';
import { get_body } from '@sveltejs/kit/http';
// App is a dynamic file built from the application layer.
/*eslint import/no-unresolved: [2, { ignore: ['\.\/app\.js$'] }]*/
import * as app from './app.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { PORT = 3000 } = process.env; // TODO configure via svelte.config.js

const mutable = (dir) =>
	sirv(dir, {
		etag: true,
		maxAge: 0
	});

const noop_handler = (_req, _res, next) => next();

const prerendered_handler = fs.existsSync('prerendered') ? mutable('prerendered') : noop_handler;

const assets_handler = sirv(join(__dirname, '/assets'), {
	maxAge: 31536000,
	immutable: true
});

polka()
	.use(compression({ threshold: 0 }), assets_handler, prerendered_handler, async (req, res) => {
		const parsed = parse(req.url || '');
		const rendered = await app.render({
			method: req.method,
			headers: req.headers, // TODO: what about repeated headers, i.e. string[]
			path: parsed.pathname,
			body: await get_body(req),
			query: new URLSearchParams(parsed.query || '')
		});

		if (rendered) {
			res.writeHead(rendered.status, rendered.headers);
			res.end(rendered.body);
		} else {
			res.statusCode = 404;
			res.end('Not found');
		}
	})
	.listen(PORT, (err) => {
		if (err) {
			console.log('error', err);
		} else {
			console.log(`Listening on port ${PORT}`);
		}
	});
