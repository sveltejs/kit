import fs from 'fs';
import http from 'http';
import sirv from 'sirv';
import { render } from '@sveltejs/app-utils';

const manifest = require('./manifest.js');
const client = require('./client.json');

const { PORT = 3000 } = process.env;

const public_handler = sirv('static');
const assets_handler = sirv('build/assets');

const App = require('./app.js');
const template = fs.readFileSync('build/app.html', 'utf-8');

const server = http.createServer((req, res) => {
	assets_handler(req, res, () => {
		public_handler(req, res, async () => {
			const rendered = await render({
				static_dir: 'static',
				template,
				manifest,
				client,
				host: req.headers.host,
				url: req.url,
				App: require('./app.js'),
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