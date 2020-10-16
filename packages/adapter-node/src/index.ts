import fs from 'fs';
import http from 'http';
import { parse, URLSearchParams } from 'url';
import sirv from 'sirv';
import { render } from '@sveltejs/app-utils';

const manifest = require('./manifest.js');
const client = require('./client.json');

const { PORT = 3000 } = process.env;

const public_handler = sirv('static', {
	etag: true,
	setHeaders: (res) => {
		// TODO offer more fine-grained control over caching?
		res.setHeader('cache-control', `public, max-age=0, must-revalidate`);
	}
});

const assets_handler = sirv('build/assets', {
	maxAge: 31536000,
	immutable: true
});

const App = require('./app.js');
const template = fs.readFileSync('build/app.html', 'utf-8');

const server = http.createServer((req, res) => {
	assets_handler(req, res, () => {
		public_handler(req, res, async () => {
			const parsed = parse(req.url);

			const rendered = await render({
				host: null, // TODO
				method: req.method,
				headers: req.headers,
				path: parsed.pathname,
				query: new URLSearchParams(parsed.query)
			}, {
				static_dir: 'static',
				template,
				manifest,
				client,
				App,
				load: route => require(`./routes/${route.name}.js`),
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

server.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});