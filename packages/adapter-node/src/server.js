import * as fs from 'fs';
import * as http from 'http';
import { parse, URLSearchParams } from 'url';
import sirv from 'sirv';
import { get_body } from '@sveltejs/app-utils/http';

const app = require('./app.js');

const { PORT = 3000 } = process.env; // TODO configure via svelte.config.js

const mutable = (dir) =>
	sirv(dir, {
		etag: true,
		maxAge: 0
	});

const noop_handler = (_req, _res, next) => next();

// TODO how to handle the case where `paths.assets !== ''` and `paths.generated !== '/app'`?
// Does that even make sense in the context of adapter-node?
const static_handler = fs.existsSync(app.files.assets) ? mutable(app.files.assets) : noop_handler;
const prerendered_handler = fs.existsSync('build/prerendered')
	? mutable('build/prerendered')
	: noop_handler;

const assets_handler = sirv('build/assets', {
	maxAge: 31536000,
	immutable: true
});

const server = http.createServer((req, res) => {
	const parsed = parse(req.url || '');

	assets_handler(req, res, () => {
		static_handler(req, res, () => {
			prerendered_handler(req, res, async () => {
				const rendered = await app.render({
					host: null, // TODO
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
});

server.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});
