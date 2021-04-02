import fs from 'fs';
import { parse, pathToFileURL, URLSearchParams } from 'url';
import sirv from 'sirv';
import { get_body } from '../http/index.js';
import { join, resolve } from 'path';
import { get_server } from '../server/index.js';

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
 *   config: import('types.internal').ValidatedConfig;
 *   https?: boolean;
 *   cwd?: string;
 * }} opts
 */
export async function start({ port, host, config, https: use_https = false, cwd = process.cwd() }) {
	const app_file = resolve(cwd, '.svelte/output/server/app.js');

	/** @type {import('types.internal').App} */
	const app = await import(pathToFileURL(app_file).href);

	/** @type {import('sirv').RequestHandler} */
	const static_handler = fs.existsSync(config.kit.files.assets)
		? mutable(config.kit.files.assets)
		: (_req, _res, next) => next();

	const assets_handler = sirv(resolve(cwd, '.svelte/output/client'), {
		maxAge: 31536000,
		immutable: true
	});

	return get_server(port, host, use_https, (req, res) => {
		const parsed = parse(req.url || '');

		assets_handler(req, res, () => {
			static_handler(req, res, async () => {
				const rendered = await app.render(
					{
						host: /** @type {string} */ (config.kit.host ||
							req.headers[config.kit.hostHeader || 'host']),
						method: req.method,
						headers: /** @type {import('types.internal').Headers} */ (req.headers),
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
	});
}
