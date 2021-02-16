import * as fs from 'fs';
import * as http from 'http';
import { parse, URLSearchParams } from 'url';
import sirv from 'sirv';
import { get_body } from '@sveltejs/app-utils/http';

const app = await import('./app.js');

const { PORT = 3000 } = process.env; // TODO configure via svelte.config.js

const mutable = (dir) =>
	sirv(dir, {
		etag: true,
		maxAge: 0
	});

const noop_handler = (_req, _res, next) => next();

const prerendered_handler = fs.existsSync('prerendered') ? mutable('prerendered') : noop_handler;

const assets_handler = sirv('assets', {
	maxAge: 31536000,
	immutable: true
});

const server = http.createServer((req, res) => {
	const parsed = parse(req.url || '');

	assets_handler(req, res, () => {
		prerendered_handler(req, res, async () => {
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
		});
	});
});

server.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});
