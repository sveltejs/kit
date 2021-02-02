import * as fs from 'fs';
import * as http from 'http';
import relative from 'require-relative';
import { parse, URLSearchParams } from 'url';
import sirv from 'sirv';
import { get_body } from '@sveltejs/app-utils/http';
import { join } from 'path';

const mutable = (dir) =>
	sirv(dir, {
		etag: true,
		maxAge: 0
	});

export function start({ port, config }) {
	return new Promise((fulfil) => {
		const app = relative('./.svelte/build/optimized/server/app.cjs');

		const static_handler = fs.existsSync(config.files.assets)
			? mutable(config.files.assets)
			: (_req, _res, next) => next();

		const assets_handler = sirv('.svelte/build/optimized/client', {
			maxAge: 31536000,
			immutable: true
		});

		const server = http.createServer((req, res) => {
			const parsed = parse(req.url || '');

			assets_handler(req, res, () => {
				static_handler(req, res, async () => {
					const rendered = await app.render(
						{
							method: req.method,
							headers: req.headers,
							path: parsed.pathname,
							body: await get_body(req),
							query: new URLSearchParams(parsed.query || '')
						},
						{
							paths: {
								base: '',
								assets: '/.'
							},
							get_stack: (error) => error.stack, // TODO should this return a sourcemapped stacktrace?
							get_static_file: (file) => fs.readFileSync(join(config.files.assets, file))
						}
					);

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

		server.listen(port, () => {
			fulfil(server);
		});

		return server;
	});
}
