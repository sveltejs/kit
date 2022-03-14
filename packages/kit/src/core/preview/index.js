import fs from 'fs';
import http from 'http';
import https from 'https';
import { join } from 'path';
import sirv from 'sirv';
import { pathToFileURL } from 'url';
import { getRequest, setResponse } from '../../node.js';
import { installFetch } from '../../install-fetch.js';
import { SVELTE_KIT_ASSETS } from '../constants.js';
import { normalize_path } from '../../utils/url.js';

/** @typedef {import('http').IncomingMessage} Req */
/** @typedef {import('http').ServerResponse} Res */
/** @typedef {(req: Req, res: Res, next: () => void) => void} Handler */

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
		: (req, res, next) => next();

/**
 * @param {{
 *   port: number;
 *   host?: string;
 *   config: import('types').ValidatedConfig;
 *   https?: boolean;
 *   cwd?: string;
 * }} opts
 */
export async function preview({ port, host, config, https: use_https = false }) {
	installFetch();

	const { paths } = config.kit;
	const base = paths.base;
	const assets = paths.assets ? SVELTE_KIT_ASSETS : paths.base;

	const etag = `"${Date.now()}"`;

	const index_file = join(config.kit.outDir, 'output/server/index.js');
	const manifest_file = join(config.kit.outDir, 'output/server/manifest.js');

	/** @type {import('types').ServerModule} */
	const { Server, override } = await import(pathToFileURL(index_file).href);
	const { manifest } = await import(pathToFileURL(manifest_file).href);

	override({
		paths: { base, assets },
		prerendering: false,
		protocol: use_https ? 'https' : 'http',
		read: (file) => fs.readFileSync(join(config.kit.files.assets, file))
	});

	const server = new Server(manifest);

	const handle = compose([
		// files in `static`
		scoped(assets, mutable(config.kit.files.assets)),

		// immutable generated client assets
		scoped(
			assets,
			sirv(join(config.kit.outDir, 'output/client'), {
				maxAge: 31536000,
				immutable: true
			})
		),

		// prerendered dependencies
		scoped(base, mutable(join(config.kit.outDir, 'output/prerendered/dependencies'))),

		// prerendered pages (we can't just use sirv because we need to
		// preserve the correct trailingSlash behaviour)
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

			const { pathname, search } = new URL(/** @type {string} */ (req.url), 'http://dummy');

			const normalized = normalize_path(pathname, config.kit.trailingSlash);

			if (normalized !== pathname) {
				res.writeHead(307, {
					location: base + normalized + search
				});
				res.end();
				return;
			}

			// only treat this as a page if it doesn't include an extension
			if (pathname === '/' || /\/[^./]+\/?$/.test(pathname)) {
				const file = join(
					config.kit.outDir,
					'output/prerendered/pages' + pathname + (pathname.endsWith('/') ? 'index.html' : '.html')
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
		}),

		// SSR
		async (req, res) => {
			const protocol = use_https ? 'https' : 'http';
			const host = req.headers['host'];

			let request;

			try {
				request = await getRequest(`${protocol}://${host}`, req);
			} catch (/** @type {any} */ err) {
				res.statusCode = err.status || 400;
				return res.end(err.reason || 'Invalid request body');
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
		}
	]);

	const vite_config = (config.kit.vite && (await config.kit.vite())) || {};

	const http_server = await get_server(use_https, vite_config, (req, res) => {
		if (req.url == null) {
			throw new Error('Invalid request url');
		}

		handle(req, res);
	});

	return new Promise((fulfil) => {
		http_server.listen(port, host || '0.0.0.0', () => {
			fulfil(http_server);
		});
	});
}

/**
 * @param {boolean} use_https
 * @param {import('vite').UserConfig} user_config
 * @param {(req: http.IncomingMessage, res: http.ServerResponse) => void} handler
 * @returns {Promise<import('net').Server>}
 */
async function get_server(use_https, user_config, handler) {
	/** @type {https.ServerOptions} */
	const https_options = {};

	if (use_https) {
		const secure_opts = user_config.server
			? /** @type {import('tls').SecureContextOptions} */ (user_config.server.https)
			: {};

		if (secure_opts.key && secure_opts.cert) {
			https_options.key = secure_opts.key.toString();
			https_options.cert = secure_opts.cert.toString();
		} else {
			https_options.key = https_options.cert = (await import('./cert')).createCertificate();
		}
	}

	return use_https
		? https.createServer(/** @type {https.ServerOptions} */ (https_options), handler)
		: http.createServer(handler);
}

/** @param {Handler[]} handlers */
function compose(handlers) {
	/**
	 * @param {Req} req
	 * @param {Res} res
	 */
	return (req, res) => {
		/** @param {number} i */
		function next(i) {
			const handler = handlers[i];

			if (handler) {
				handler(req, res, () => next(i + 1));
			} else {
				res.statusCode = 404;
				res.end('Not found');
			}
		}

		next(0);
	};
}

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
