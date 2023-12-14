import fs from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lookup } from 'mrmime';
import sirv from 'sirv';
import { loadEnv, normalizePath } from 'vite';
import { getRequest, setResponse } from '../../../exports/node/index.js';
import { installPolyfills } from '../../../exports/node/polyfills.js';
import { SVELTE_KIT_ASSETS } from '../../../constants.js';

/** @typedef {import('http').IncomingMessage} Req */
/** @typedef {import('http').ServerResponse} Res */
/** @typedef {(req: Req, res: Res, next: () => void) => void} Handler */

/**
 * @param {{ middlewares: import('connect').Server }} vite
 * @param {import('vite').ResolvedConfig} vite_config
 * @param {import('types').ValidatedConfig} svelte_config
 */
export async function preview(vite, vite_config, svelte_config) {
	installPolyfills();

	const { paths } = svelte_config.kit;
	const assets = paths.assets ? SVELTE_KIT_ASSETS : paths.base;

	const protocol = vite_config.preview.https ? 'https' : 'http';

	const etag = `"${Date.now()}"`;

	const dir = join(svelte_config.kit.outDir, 'output/server');

	if (!fs.existsSync(dir)) {
		throw new Error(`Server files not found at ${dir}, did you run \`build\` first?`);
	}

	/** @type {import('types').ServerInternalModule} */
	const { set_assets } = await import(pathToFileURL(join(dir, 'internal.js')).href);

	/** @type {import('types').ServerModule} */
	const { Server } = await import(pathToFileURL(join(dir, 'index.js')).href);

	const { manifest } = await import(pathToFileURL(join(dir, 'manifest.js')).href);

	set_assets(assets);

	const server = new Server(manifest);
	await server.init({
		env: loadEnv(vite_config.mode, svelte_config.kit.env.dir, '')
	});

	return () => {
		// prerendered dependencies
		vite.middlewares.use(
			mutable(join(svelte_config.kit.outDir, 'output/prerendered/dependencies'))
		);

		// prerendered pages (we can't just use sirv because we need to
		// preserve the correct trailingSlash behaviour)
		vite.middlewares.use((req, res, next) => {
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

			let filename = normalizePath(
				join(svelte_config.kit.outDir, 'output/prerendered/pages' + pathname)
			);
			let prerendered = is_file(filename);

			if (!prerendered) {
				const has_trailing_slash = pathname.endsWith('/');
				const html_filename = `${filename}${has_trailing_slash ? 'index.html' : '.html'}`;

				/** @type {string | undefined} */
				let redirect;

				if (is_file(html_filename)) {
					filename = html_filename;
					prerendered = true;
				} else if (has_trailing_slash) {
					if (is_file(filename.slice(0, -1) + '.html')) {
						redirect = pathname.slice(0, -1);
					}
				} else if (is_file(filename + '/index.html')) {
					redirect = pathname + '/';
				}

				if (redirect) {
					if (search) redirect += search;
					res.writeHead(307, {
						location: redirect
					});

					res.end();

					return;
				}
			}

			if (prerendered) {
				res.writeHead(200, {
					'content-type': lookup(pathname) || 'text/html',
					etag
				});

				fs.createReadStream(filename).pipe(res);
			} else {
				next();
			}
		});

		// SSR
		vite.middlewares.use(async (req, res) => {
			const host = req.headers['host'];
			req.url = req.originalUrl;

			const request = await getRequest({
				base: `${protocol}://${host}`,
				request: req
			});

			setResponse(
				res,
				await server.respond(request, {
					getClientAddress: () => {
						const { remoteAddress } = req.socket;
						if (remoteAddress) return remoteAddress;
						throw new Error('Could not determine clientAddress');
					},
					read: (file) => fs.readFileSync(join(svelte_config.kit.files.assets, file))
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

/** @param {string} path */
function is_file(path) {
	return fs.existsSync(path) && !fs.statSync(path).isDirectory();
}
