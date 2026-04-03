import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { styleText } from 'node:util';
import sirv from 'sirv';
import { isCSSRequest, isFetchableDevEnvironment } from 'vite';
import { getRequest, setResponse } from '../../../exports/node/index.js';
import { coalesce_to_error } from '../../../utils/error.js';
import { resolve_entry } from '../../../utils/filesystem.js';
import { posixify } from '../../../utils/os.js';
import { load_error_page } from '../../../core/config/index.js';
import { SVELTE_KIT_ASSETS } from '../../../constants.js';
import * as sync from '../../../core/sync/sync.js';
import { not_found } from '../utils.js';
import { escape_html } from '../../../utils/escape.js';
import { sveltekit_ssr_manifest } from '../module_ids.js';
import { to_fs } from '../filesystem.js';

// vite-specifc queries that we should skip handling for css urls
const vite_css_query_regex = /(?:\?|&)(?:raw|url|inline)(?:&|$)/;

/**
 * @param {import('vite').ViteDevServer} vite
 * @param {import('vite').ResolvedConfig} vite_config
 * @param {import('types').ValidatedConfig} svelte_config
 * @param {string} root The project root directory
 * @param {import('types').DevEnvironment} dev_environment
 * @return {() => void}
 */
export function dev(vite, vite_config, svelte_config, root, dev_environment) {
	sync.init(svelte_config, vite_config.mode, root);

	/** @type {import('types').ManifestData} */
	let manifest_data;

	/** @type {Error | null} */
	let manifest_error = null;

	function update_manifest() {
		try {
			({ manifest_data } = sync.create(svelte_config, root));
			dev_environment.manifest_data = manifest_data;

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

		void invalidate_module(vite, sveltekit_ssr_manifest);
	}

	update_manifest();

	/**
	 * @param {string} event
	 * @param {(file: string) => void} cb
	 */
	const watch = (event, cb) => {
		vite.watcher.on(event, (file) => {
			if (
				file.startsWith(svelte_config.kit.files.routes + path.sep) ||
				file.startsWith(svelte_config.kit.files.params + path.sep) ||
				svelte_config.kit.moduleExtensions.some((ext) => file.endsWith(`.remote${ext}`)) ||
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

	// flag to skip watchers if server is already restarting
	let restarting = false;

	// Debounce add/unlink events because in case of folder deletion or moves
	// they fire in rapid succession, causing needless invocations.
	// These watchers only run for routes, param matchers, and client hooks.
	watch('add', () => debounce(update_manifest));
	watch('unlink', () => debounce(update_manifest));
	watch('change', (file) => {
		// Don't run for a single file if the whole manifest is about to get updated
		// Unless it's a file where the trailing slash page option might have changed
		if (timeout || restarting || !/\+(page|layout|server).*$/.test(file)) return;
		sync.update(svelte_config, manifest_data, file, root);
		// TODO: perform a partial update instead of invalidating the whole virtual module?
		void invalidate_module(vite, sveltekit_ssr_manifest);
	});

	const { appTemplate, errorTemplate, serviceWorker, hooks } = svelte_config.kit.files;

	// vite client only executes a full reload if the triggering html file path is index.html
	// kit defaults to src/app.html, so unless user changed that to index.html
	// send the vite client a full-reload event without path being set
	if (appTemplate !== 'index.html') {
		vite.watcher.on('change', (file) => {
			if (file === appTemplate && !restarting) {
				vite.ws.send({ type: 'full-reload' });
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

	vite.watcher.on('change', async (file) => {
		// changing the svelte config requires restarting the dev server
		// the config is only read on start and passed on to vite-plugin-svelte
		// which needs up-to-date values to operate correctly
		if (file.match(/[/\\]svelte\.config\.[jt]s$/)) {
			console.log(`svelte config changed, restarting vite dev-server. changed file: ${file}`);
			restarting = true;
			await vite.restart();
		}
	});

	const assets = svelte_config.kit.paths.assets ? SVELTE_KIT_ASSETS : svelte_config.kit.paths.base;
	dev_environment.assets = assets;

	const asset_server = sirv(svelte_config.kit.files.assets, {
		dev: true,
		etag: true,
		maxAge: 0,
		extensions: [],
		setHeaders: (res) => {
			res.setHeader('access-control-allow-origin', '*');
		}
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

	return () => {
		const serve_static_middleware = vite.middlewares.stack.find(
			(middleware) =>
				/** @type {function} */ (middleware.handle).name === 'viteServeStaticMiddleware'
		);

		// Vite will give a 403 on URLs like /test, /static, and /package.json preventing us from
		// serving routes with those names. See https://github.com/vitejs/vite/issues/7363
		remove_static_middlewares(vite.middlewares);

		vite.middlewares.use(async (req, res, next) => {
			dev_environment.remote_address = req.socket.remoteAddress;

			// Vite's base middleware strips out the base path. Restore it
			let original_url = req.url;
			req.url = req.originalUrl;
			try {
				const base = `${vite.config.server.https ? 'https' : 'http'}://${
					req.headers[':authority'] || req.headers.host
				}`;

				let decoded = decodeURI(new URL(base + req.url).pathname);

				// requests to _app/immutable during development are fetchable dev
				// environments trying to read the filesystem
				const immutable = `/${svelte_config.kit.appDir}/immutable`;
				if (decoded.startsWith(immutable)) {
					decoded = decoded.slice(immutable.length);
					original_url = original_url?.slice(immutable.length);
				}

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

				// fallback to our own fetch handler if the adapter doesn't provide one
				if (
					!svelte_config.kit.adapter?.vite?.plugins &&
					isFetchableDevEnvironment(vite.environments.ssr)
				) {
					const request = await getRequest({
						base,
						request: req
					});
					const response = await vite.environments.ssr.dispatchFetch(request);

					if (response.status === 404) {
						// @ts-expect-error
						serve_static_middleware.handle(req, res, () => {
							void setResponse(res, response);
						});
					} else {
						void setResponse(res, response);
					}
					return;
				}

				next();
			} catch (e) {
				const error = coalesce_to_error(e);
				res.statusCode = 500;
				res.end(error.stack);
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
 * @param {import('vite').ViteDevServer} vite
 * @param {import('vite').ModuleNode | import('vite').EnvironmentModuleNode} node
 * @param {Set<import('vite').ModuleNode | import('vite').EnvironmentModuleNode>} deps
 */
async function find_deps(vite, node, deps) {
	// since `ssrTransformResult.deps` contains URLs instead of `ModuleNode`s, this process is asynchronous.
	// instead of using `await`, we resolve all branches in parallel.
	/** @type {Promise<void>[]} */
	const branches = [];

	/** @param {import('vite').ModuleNode | import('vite').EnvironmentModuleNode} node */
	async function add(node) {
		if (!deps.has(node)) {
			deps.add(node);
			await find_deps(vite, node, deps);
		}
	}

	/** @param {string} url */
	async function add_by_url(url) {
		const node = await vite.environments.ssr.moduleGraph.getModuleByUrl(url);

		if (node) {
			await add(node);
		}
	}

	if (node.transformResult) {
		if (node.transformResult.deps) {
			node.transformResult.deps.forEach((url) => branches.push(add_by_url(url)));
		}

		if (node.transformResult.dynamicDeps) {
			node.transformResult.dynamicDeps.forEach((url) => branches.push(add_by_url(url)));
		}
	} else {
		node.importedModules.forEach((node) => branches.push(add(node)));
	}

	await Promise.all(branches);
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
 * @param {import('vite').ViteDevServer} vite
 * @param {string} id
 * @returns {void}
 */
export function invalidate_module(vite, id) {
	for (const environment in vite.environments) {
		const module = vite.environments[environment].moduleGraph.getModuleById(id);
		if (module) {
			vite.environments[environment].moduleGraph.invalidateModule(module);
		}
	}
}

/**
 * @param {import('vite').ViteDevServer} vite
 * @param {string[]} urls
 * @returns {Promise<Record<string, string>>}
 */
export async function get_inline_css(vite, urls) {
	/** @type {Set<import('vite').EnvironmentModuleNode>} */
	const deps = new Set();

	for (const url of urls) {
		const module_node = await vite.environments.ssr.moduleGraph.getModuleByUrl(url);
		if (!module_node) throw new Error(`Could not find node for ${url}`);
		await find_deps(vite, module_node, deps);
	}

	/** @type {Map<string, string>} */
	const styles = new Map();

	for (const dep of deps) {
		if (isCSSRequest(dep.url) && !vite_css_query_regex.test(dep.url)) {
			const inline_css_url = dep.url.includes('?')
				? dep.url.replace('?', '?inline&')
				: dep.url + '?inline';
			styles.set(dep.url, inline_css_url);
		}
	}

	return Object.fromEntries(styles);
}
