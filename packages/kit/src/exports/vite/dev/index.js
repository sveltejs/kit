/** @import { ViteDevServer } from 'vite' */
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { styleText } from 'node:util';
import sirv from 'sirv';
import { isRunnableDevEnvironment } from 'vite';
import { getRequest, setResponse } from '../../../exports/node/index.js';
import { coalesce_to_error } from '../../../utils/error.js';
import { resolve_entry } from '../../../utils/filesystem.js';
import { to_fs } from '../../../utils/vite.js';
import { posixify } from '../../../utils/os.js';
import { load_error_page } from '../../../core/config/index.js';
import { SVELTE_KIT_ASSETS } from '../../../constants.js';
import * as sync from '../../../core/sync/sync.js';
import '../../../utils/mime.js'; // extend mrmime with additional types (affects sirv too)
import {
	is_chrome_devtools_request,
	log_response,
	not_found,
	remote_module_pattern
} from '../utils.js';
import { escape_html } from '../../../utils/escape.js';
import { fix_stack_trace } from './sourcemaps.js';
import { sveltekit_dev_manifest_data, sveltekit_dev_server } from '../module_ids.js';

/**
 * @param {import('vite').ViteDevServer} vite
 * @param {import('vite').ResolvedConfig} vite_config
 * @param {import('types').ValidatedConfig} svelte_config
 * @param {string} root The project root directory
 * @param {(manifest_data: import('types').ManifestData) => void} set_manifest_data
 * @return {() => void}
 */
export function dev(vite, vite_config, svelte_config, root, set_manifest_data) {
	sync.init(svelte_config, root);

	/** @type {import('types').ManifestData} */
	let manifest_data;

	/** @type {Error | null} */
	let manifest_error = null;

	function update_manifest() {
		try {
			({ manifest_data } = sync.create(svelte_config, root));
			set_manifest_data(manifest_data);

			if (manifest_error) {
				manifest_error = null;
				vite.hot.send({ type: 'full-reload' });
			}
		} catch (error) {
			manifest_error = /** @type {Error} */ (error);

			console.error(styleText(['bold', 'red'], manifest_error.message));
			vite.hot.send({
				type: 'error',
				err: {
					message: manifest_error.message ?? 'Invalid routes',
					stack: ''
				}
			});

			return;
		}
	}

	update_manifest();

	const params_file = resolve_entry(svelte_config.kit.files.params);

	/**
	 * @param {string} event
	 * @param {(file: string) => void} cb
	 */
	const watch = (event, cb) => {
		vite.watcher.on(event, (file) => {
			if (
				file.startsWith(svelte_config.kit.files.routes + path.sep) ||
				file.startsWith(svelte_config.kit.files.assets + path.sep) ||
				(params_file && file === params_file) ||
				remote_module_pattern.test(file) ||
				// in contrast to server hooks, client hooks are written to the client manifest
				// and therefore need rebuilding when they are added/removed
				file.startsWith(svelte_config.kit.files.hooks.client)
			) {
				cb(file);
			}
		});
	};
	/** @type {NodeJS.Timeout | null } */
	let timeout = null;
	/** @param {() => void} to_run */
	const debounce = (to_run) => {
		timeout && clearTimeout(timeout);
		timeout = setTimeout(() => {
			timeout = null;
			to_run();
		}, 100);
	};

	// Debounce add/unlink events because in case of folder deletion or moves
	// they fire in rapid succession, causing needless invocations.
	// These watchers only run for routes, param matchers, and client hooks.
	watch('add', () => debounce(update_manifest));
	watch('unlink', () => debounce(update_manifest));
	watch('change', (file) => {
		// `manifest_data` is populated lazily on the first request (see `update_manifest`
		// call in the middleware below), so it may still be undefined if a file changes
		// before the dev server has served a request. In that case there's nothing to
		// update — the manifest will be created from scratch on the first request.
		if (!manifest_data) return;
		// Don't run for a single file if the whole manifest is about to get updated
		// Unless it's a file where the trailing slash page option might have changed
		if (timeout || !/\+(page|layout|server).*$/.test(file)) return;
		sync.update(svelte_config, manifest_data, file, root);
		invalidate_module(vite, sveltekit_dev_manifest_data);
	});

	const { appTemplate, errorTemplate, serviceWorker, hooks } = svelte_config.kit.files;

	// vite client only executes a full reload if the triggering html file path is index.html
	// kit defaults to src/app.html, so unless user changed that to index.html
	// send the vite client a full-reload event without path being set
	if (appTemplate !== 'index.html') {
		vite.watcher.on('change', (file) => {
			if (file === appTemplate) {
				vite.hot.send({ type: 'full-reload' });
			}
		});
	}

	vite.watcher.on('all', (_, file) => {
		if (
			file === appTemplate ||
			file === errorTemplate ||
			file.startsWith(serviceWorker) ||
			file.startsWith(hooks.server)
		) {
			sync.server(svelte_config, root);
		}
	});

	const assets = svelte_config.kit.paths.assets ? SVELTE_KIT_ASSETS : svelte_config.kit.paths.base;
	const asset_server = sirv(svelte_config.kit.files.assets, {
		dev: true,
		etag: true,
		maxAge: 0,
		extensions: []
	});

	vite.middlewares.use((req, res, next) => {
		const base = `${vite.config.server.https ? 'https' : 'http'}://${
			req.headers[':authority'] || req.headers.host
		}`;

		const decoded = decodeURI(new URL(base + req.url).pathname);

		if (decoded.startsWith(assets)) {
			const pathname = decoded.slice(assets.length);
			const file = svelte_config.kit.files.assets + pathname;

			if (fs.existsSync(file) && !fs.statSync(file).isDirectory()) {
				if (has_correct_case(file, svelte_config.kit.files.assets)) {
					req.url = encodeURI(pathname); // don't need query/hash
					asset_server(req, res);
					return;
				}
			}
		}

		next();
	});

	let inited_manifest = false;

	return () => {
		const serve_static_middleware = vite.middlewares.stack.find(
			(middleware) =>
				/** @type {Function} */ (middleware.handle).name === 'viteServeStaticMiddleware'
		);

		// Vite will give a 403 on URLs like /test, /static, and /package.json preventing us from
		// serving routes with those names. See https://github.com/vitejs/vite/issues/7363
		remove_static_middlewares(vite.middlewares);

		vite.middlewares.use(async (req, res) => {
			// Vite throws a Cannot read properties of undefined (reading 'wrapDynamicImport')
			// if you try to run ssr.runner.import before the server has started so
			// we do it inside here to avoid that
			if (!inited_manifest) {
				inited_manifest = true;
				update_manifest();
			}

			// Vite's base middleware strips out the base path. Restore it
			const original_url = req.url;
			req.url = req.originalUrl;
			try {
				const base = `${vite.config.server.https ? 'https' : 'http'}://${
					req.headers[':authority'] || req.headers.host
				}`;

				const decoded = decodeURI(new URL(base + req.url).pathname);
				const file = posixify(
					path.resolve(root, decoded.slice(svelte_config.kit.paths.base.length + 1))
				);
				const is_file = fs.existsSync(file) && !fs.statSync(file).isDirectory();
				const allowed =
					!vite_config.server.fs.strict ||
					vite_config.server.fs.allow.some((dir) => file.startsWith(dir));

				if (is_file && allowed) {
					req.url = original_url;
					// @ts-expect-error
					serve_static_middleware.handle(req, res);
					return;
				}

				if (is_chrome_devtools_request(decoded, res)) {
					return;
				}

				if (!decoded.startsWith(svelte_config.kit.paths.base)) {
					return not_found(req, res, svelte_config.kit.paths.base);
				}

				if (decoded === svelte_config.kit.paths.base + '/service-worker.js') {
					const resolved = resolve_entry(svelte_config.kit.files.serviceWorker);

					if (resolved) {
						res.writeHead(200, {
							'content-type': 'application/javascript'
						});
						res.end(`import '${svelte_config.kit.paths.base}${to_fs(resolved)}';`);
					} else {
						res.writeHead(404);
						res.end('not found');
					}

					return;
				}

				if (manifest_error) {
					console.error(styleText(['bold', 'red'], manifest_error.message));

					const error_page = load_error_page(svelte_config);

					/** @param {{ status: number; message: string }} opts */
					const error_template = ({ status, message }) => {
						return error_page
							.replace(/%sveltekit\.status%/g, String(status))
							.replace(/%sveltekit\.error\.message%/g, escape_html(message));
					};

					res.writeHead(500, {
						'Content-Type': 'text/html; charset=utf-8'
					});
					res.end(
						error_template({ status: 500, message: manifest_error.message ?? 'Invalid routes' })
					);

					return;
				}

				const request = getRequest({
					base,
					request: req
				});

				if (!isRunnableDevEnvironment(vite.environments.ssr)) {
					throw new Error('The configured Vite SSR environment must be a RunnableDevEnvironment');
				}

				/** @type {{ fetch(request: Request): Promise<Response> }} */
				const server_entry = await vite.environments.ssr.runner.import(sveltekit_dev_server);

				if (req.socket.remoteAddress) {
					request.headers.set('x-sveltekit-remote-address', req.socket.remoteAddress);
				}

				const rendered = await server_entry.fetch(request);

				if (rendered.status === 404) {
					// @ts-expect-error
					serve_static_middleware.handle(req, res, () => {
						log_response(rendered.status, request);
						setResponse(res, rendered);
					});
				} else {
					log_response(rendered.status, request);
					setResponse(res, rendered);
				}
			} catch (e) {
				const error = coalesce_to_error(e);
				res.statusCode = 500;
				fix_stack_trace(error);
				res.end(error.stack || error.message); // handle `stackless` errors
			}
		});
	};
}

/**
 * @param {import('connect').Server} server
 */
function remove_static_middlewares(server) {
	const static_middlewares = ['viteServeStaticMiddleware', 'viteServePublicMiddleware'];
	for (let i = server.stack.length - 1; i > 0; i--) {
		// @ts-expect-error using internals
		if (static_middlewares.includes(server.stack[i].handle.name)) {
			server.stack.splice(i, 1);
		}
	}
}

/**
 * Determine if a file is being requested with the correct case,
 * to ensure consistent behaviour between dev and prod and across
 * operating systems. Note that we can't use realpath here,
 * because we don't want to follow symlinks
 * @param {string} file
 * @param {string} assets
 * @returns {boolean}
 */
function has_correct_case(file, assets) {
	if (file === assets) return true;

	const parent = path.dirname(file);

	if (fs.readdirSync(parent).includes(path.basename(file))) {
		return has_correct_case(parent, assets);
	}

	return false;
}

/**
 * @param {ViteDevServer} server
 * @param {string} id
 * @returns {void}
 */
export function invalidate_module(server, id) {
	for (const environment in server.environments) {
		const module = server.environments[environment].moduleGraph.getModuleById(id);
		if (module) {
			server.environments[environment].moduleGraph.invalidateModule(module);
			void server.environments[environment].reloadModule(module);
		}
	}
}
