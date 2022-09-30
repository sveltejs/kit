import fs from 'fs';
import { join } from 'path';
import sirv from 'sirv';
import { pathToFileURL } from 'url';
import { getRequest, setResponse } from '../../../exports/node/index.js';
import { installPolyfills } from '../../../exports/node/polyfills.js';
import { SVELTE_KIT_ASSETS } from '../../../constants.js';
import { loadEnv } from 'vite';

/** @typedef {import('http').IncomingMessage} Req */
/** @typedef {import('http').ServerResponse} Res */
/** @typedef {(req: Req, res: Res, next: () => void) => void} Handler */

/**
 * @param {{
 *   middlewares: import('connect').Server;
 *   httpServer: import('http').Server;
 * }} vite
 * @param {import('vite').ResolvedConfig} vite_config
 * @param {import('types').ValidatedConfig} svelte_config
 */
export async function preview(vite, vite_config, svelte_config) {
	installPolyfills();

	const { paths } = svelte_config.kit;
	const base = paths.base;
	const assets = paths.assets ? SVELTE_KIT_ASSETS : paths.base;

	const protocol = vite_config.preview.https ? 'https' : 'http';

	const etag = `"${Date.now()}"`;

	const index_file = join(svelte_config.kit.outDir, 'output/server/index.js');
	const manifest_file = join(svelte_config.kit.outDir, 'output/server/manifest.js');

	/** @type {import('types').ServerModule} */
	const { Server, override } = await import(pathToFileURL(index_file).href);
	const { manifest } = await import(pathToFileURL(manifest_file).href);

	override({
		paths: { base, assets },
		prerendering: false,
		protocol,
		read: (file) => fs.readFileSync(join(svelte_config.kit.files.assets, file))
	});

	const server = new Server(manifest);
	await server.init({
		env: loadEnv(vite_config.mode, svelte_config.kit.env.dir, '')
	});

	return () => {
		// generated client assets and the contents of `static`
		vite.middlewares.use(
			scoped(
				assets,
				sirv(join(svelte_config.kit.outDir, 'output/client'), {
					setHeaders: (res, pathname) => {
						// only apply to immutable directory, not e.g. version.json
						if (pathname.startsWith(`/${svelte_config.kit.appDir}/immutable`)) {
							res.setHeader('cache-control', 'public,max-age=31536000,immutable');
						}
					}
				})
			)
		);

		vite.middlewares.use((req, res, next) => {
			const original_url = /** @type {string} */ (req.url);
			const { pathname } = new URL(original_url, 'http://dummy');

			if (pathname.startsWith(base)) {
				next();
			} else {
				res.statusCode = 404;
				res.end(`Not found (did you mean ${base + pathname}?)`);
			}
		});

		// prerendered dependencies
		vite.middlewares.use(
			scoped(base, mutable(join(svelte_config.kit.outDir, 'output/prerendered/dependencies')))
		);

		// prerendered pages (we can't just use sirv because we need to
		// preserve the correct trailingSlash behaviour)
		vite.middlewares.use(
			scoped(base, (req, res, next) => {
				let if_none_match_value = req.headers['if-none-match'];

				if (if_none_match_value?.startsWith('W/"')) {
					if_none_match_value = if_none_match_value.substring(2);
				}

				if (if_none_match_value === etag) {
					res.statusCode = 304;
					res.end();
					return;
				}

				const { pathname } = new URL(/** @type {string} */ (req.url), 'http://dummy');

				// only treat this as a page if it doesn't include an extension
				if (pathname === '/' || /\/[^./]+\/?$/.test(pathname)) {
					const file = join(
						svelte_config.kit.outDir,
						'output/prerendered/pages' +
							pathname +
							(pathname.endsWith('/') ? 'index.html' : '.html')
					);

					if (fs.existsSync(file)) {
						res.writeHead(200, {
							'content-type': 'text/html',
							etag
						});

						fs.createReadStream(file).pipe(res);
						return;
					}
				}

				next();
			})
		);

		// SSR
		vite.middlewares.use(async (req, res) => {
			const host = req.headers['host'];

			let request;

			try {
				request = await getRequest({
					base: `${protocol}://${host}`,
					request: req
				});
			} catch (/** @type {any} */ err) {
				res.statusCode = err.status || 400;
				return res.end('Invalid request body');
			}

			setResponse(
				res,
				await server.respond(request, {
					getClientAddress: () => {
						const { remoteAddress } = req.socket;
						if (remoteAddress) return remoteAddress;
						throw new Error('Could not determine clientAddress');
					}
				})
			);
		});
	};
}

/**
 * @param {string} dir
 * @returns {Handler}
 */
const mutable = (dir) =>
	fs.existsSync(dir)
		? sirv(dir, {
				etag: true,
				maxAge: 0
		  })
		: (_req, _res, next) => next();

/**
 * @param {string} scope
 * @param {Handler} handler
 * @returns {Handler}
 */
function scoped(scope, handler) {
	if (scope === '') return handler;

	return (req, res, next) => {
		if (req.url?.startsWith(scope)) {
			const original_url = req.url;
			req.url = req.url.slice(scope.length);
			handler(req, res, () => {
				req.url = original_url;
				next();
			});
		} else {
			next();
		}
	};
}
