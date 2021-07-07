import fs from 'fs';
import { parse, pathToFileURL } from 'url';
import sirv from 'sirv';
import { getRawBody } from '../node/index.js';
import { join, resolve } from 'path';
import { get_server } from '../server/index.js';
import { __fetch_polyfill } from '../../install-fetch.js';
import { SVELTE_KIT } from '../constants.js';

/** @param {string} dir */
const mutable = (dir) =>
	sirv(dir, {
		etag: true,
		maxAge: 0
	});

/**
 * @param {{
 *   port: number;
 *   host: string;
 *   config: import('types/config').ValidatedConfig;
 *   https?: boolean;
 *   cwd?: string;
 * }} opts
 */
export async function start({ port, host, config, https: use_https = false, cwd = process.cwd() }) {
	__fetch_polyfill();

	const app_file = resolve(cwd, `${SVELTE_KIT}/output/server/app.js`);

	/** @type {import('types/internal').App} */
	const app = await import(pathToFileURL(app_file).href);

	/** @type {import('sirv').RequestHandler} */
	const static_handler = fs.existsSync(config.kit.files.assets)
		? mutable(config.kit.files.assets)
		: (_req, _res, next) => next();

	const assets_handler = sirv(resolve(cwd, `${SVELTE_KIT}/output/client`), {
		maxAge: 31536000,
		immutable: true
	});

	app.init({
		paths: {
			base: '',
			assets: '/.'
		},
		prerendering: false,
		read: (file) => fs.readFileSync(join(config.kit.files.assets, file))
	});

	const server = await get_server(use_https, config.kit, (req, res) => {
		const parsed = parse(req.url || '');

		assets_handler(req, res, () => {
			static_handler(req, res, async () => {
				let body;

				try {
					body = await getRawBody(req);
				} catch (err) {
					res.statusCode = err.status || 400;
					return res.end(err.reason || 'Invalid request body');
				}

				const rendered = await app.render({
					host: /** @type {string} */ (config.kit.host ||
						req.headers[config.kit.hostHeader || 'host']),
					method: req.method,
					headers: /** @type {import('types/helper').Headers} */ (req.headers),
					path: decodeURIComponent(parsed.pathname),
					query: new URLSearchParams(parsed.query || ''),
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
			});
		});
	});

	await server.listen(port, host || '0.0.0.0');

	return Promise.resolve(server);
}
