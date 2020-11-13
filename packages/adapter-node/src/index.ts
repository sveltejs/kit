import * as fs from 'fs';
import * as http from 'http';
import { parse, URLSearchParams } from 'url';
import sirv from 'sirv';
import { render } from '@sveltejs/app-utils/renderer';
import { get_body } from '@sveltejs/app-utils/http';
import type { PageComponentManifest, EndpointManifest } from '@sveltejs/app-utils';

const manifest = require('./manifest.js');
const client = require('./client.json');

const { PORT = 3000 } = process.env;

const mutable = (dir: string) => sirv(dir, {
	etag: true,
	maxAge: 0
});

const static_handler = mutable('static');
const prerendered_handler = fs.existsSync('build/prerendered')
	? mutable('build/prerendered')
	: (_req: http.IncomingMessage, _res: http.ServerResponse, next: () => void) => next();

const assets_handler = sirv('build/assets', {
	maxAge: 31536000,
	immutable: true
});

const root = require('./root.js');
const setup = require('./setup.js');
const template = fs.readFileSync('build/app.html', 'utf-8');

const server = http.createServer((req, res) => {
	assets_handler(req, res, () => {
		static_handler(req, res, () => {
			prerendered_handler(req, res, async () => {
				const parsed = parse(req.url || '');

				const rendered = await render({
					host: null, // TODO
					method: req.method,
					headers: req.headers,
					path: parsed.pathname,
					body: await get_body(req),
					query: new URLSearchParams(parsed.query || '')
				}, {
					static_dir: 'static',
					template,
					manifest,
					client,
					root,
					setup,
					load: (route: PageComponentManifest | EndpointManifest) => require(`./routes/${route.name}.js`),
					dev: false
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