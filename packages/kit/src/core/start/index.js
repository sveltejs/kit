import fs from 'fs';
import { parse, pathToFileURL } from 'url';
import sirv from 'sirv';
import { getRawBody } from '../http/index.js';
import { join, resolve } from 'path';
import { get_server } from '../server/index.js';
import '../../install-fetch.js';

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
	const app_file = resolve(cwd, '.svelte/output/server/app.js');

	/** @type {import('types/internal').App} */
	const app = await import(pathToFileURL(app_file).href);

	/** @type {import('sirv').RequestHandler} */
	const static_handler = fs.existsSync(config.kit.files.assets)
		? mutable(config.kit.files.assets)
		: (_req, _res, next) => next();

	const assets_handler = sirv(resolve(cwd, '.svelte/output/client'), {
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

	return get_server(port, host, use_https, (req, res) => {
		const parsed = parse(req.url || '');

		assets_handler(req, res, () => {
			static_handler(req, res, async () => {
				const rendered = await app.render({
					host: /** @type {string} */ (config.kit.host ||
						req.headers[config.kit.hostHeader || 'host']),
					method: req.method,
					headers: /** @type {import('types/helper').Headers} */ (req.headers),
					path: decodeURIComponent(parsed.pathname),
					rawBody: await getRawBody(req),
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
}
