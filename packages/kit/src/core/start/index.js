import fs from 'fs';
import http from 'http';
import http2 from 'http2';
import { parse, pathToFileURL, URLSearchParams } from 'url';
import sirv from 'sirv';
import { get_body } from '@sveltejs/app-utils/http';
import { join, resolve } from 'path';

/** @param {string} dir */
const mutable = (dir) =>
	sirv(dir, {
		etag: true,
		maxAge: 0
	});

/**
 * @param {{
 *   port: number;
 *   config: import('../../types').ValidatedConfig;
 *   https?: boolean | import('https').ServerOptions;
 *   cwd?: string;
 * }} opts
 * @returns {Promise<import('http').Server>}
 */
export async function start({ port, config, https = false, cwd = process.cwd() }) {
	const app_file = resolve(cwd, '.svelte/output/server/app.js');

	/** @type {import('../../types').App} */
	const app = await import(pathToFileURL(app_file).href);

	/** @type {import('sirv').RequestHandler} */
	const static_handler = fs.existsSync(config.kit.files.assets)
		? mutable(config.kit.files.assets)
		: (_req, _res, next) => next();

	const assets_handler = sirv(resolve(cwd, '.svelte/output/client'), {
		maxAge: 31536000,
		immutable: true
	});

	const handler = (req, res) => {
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
						get_static_file: (file) => fs.readFileSync(join(config.kit.files.assets, file))
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
	};

	let server;
	if (!https) {
		server = http.createServer(handler);
	} else {
		const httpsOptions = typeof https === 'boolean' ? {} : https;
		if (!httpsOptions.key || !httpsOptions.cert) {
			httpsOptions.key = httpsOptions.cert = (await import('./cert')).createCertificate();
		}
		server = http2.createSecureServer({ ...httpsOptions, allowHTTP1: true }, handler);
	}

	return new Promise((fulfil) => {
		server.listen(port, () => {
			fulfil(server);
		});
	});
}
