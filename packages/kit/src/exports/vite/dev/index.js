import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import colors from 'kleur';
import sirv from 'sirv';
import { isCSSRequest, loadEnv, buildErrorMessage } from 'vite';
import { getRequest, setResponse } from '../../../exports/node/index.js';
import { installPolyfills } from '../../../exports/node/polyfills.js';
import { coalesce_to_error } from '../../../utils/error.js';
import { posixify, resolve_entry, to_fs } from '../../../utils/filesystem.js';
import { should_polyfill } from '../../../utils/platform.js';
import { load_error_page } from '../../../core/config/index.js';
import { SVELTE_KIT_ASSETS } from '../../../constants.js';
import * as sync from '../../../core/sync/sync.js';
import { get_mime_lookup, runtime_base } from '../../../core/utils.js';
import { compact } from '../../../utils/array.js';
import { not_found } from '../utils.js';

const cwd = process.cwd();

/**
 * @param {import('vite').ViteDevServer} vite
 * @param {import('vite').ResolvedConfig} vite_config
 * @param {import('types').ValidatedConfig} svelte_config
 * @return {Promise<Promise<() => void>>}
 */
export async function dev(vite, vite_config, svelte_config) {
	if (should_polyfill) {
		installPolyfills();
	}

	const fetch = globalThis.fetch;
	globalThis.fetch = (info, init) => {
		if (typeof info === 'string' && !/^\w+:\/\//.test(info)) {
			throw new Error(
				`Cannot use relative URL (${info}) with global fetch — use \`event.fetch\` instead: https://kit.svelte.dev/docs/web-standards#fetch-apis`
			);
		}

		return fetch(info, init);
	};

	sync.init(svelte_config, vite_config.mode);

	/** @type {import('types').ManifestData} */
	let manifest_data;
	/** @type {import('@sveltejs/kit').SSRManifest} */
	let manifest;

	/** @type {Error | null} */
	let manifest_error = null;

	/** @param {string} url */
	async function loud_ssr_load_module(url) {
		try {
			return await vite.ssrLoadModule(url);
		} catch (/** @type {any} */ err) {
			const msg = buildErrorMessage(err, [colors.red(`Internal server error: ${err.message}`)]);

			vite.config.logger.error(msg, { error: err });
			vite.ws.send({
				type: 'error',
				err: {
					...err,
					// these properties are non-enumerable and will
					// not be serialized unless we explicitly include them
					message: err.message,
					stack: err.stack
				}
			});

			throw err;
		}
	}

	/** @param {string} id */
	async function resolve(id) {
		const url = id.startsWith('..') ? `/@fs${path.posix.resolve(id)}` : `/${id}`;

		const module = await loud_ssr_load_module(url);

		const module_node = await vite.moduleGraph.getModuleByUrl(url);
		if (!module_node) throw new Error(`Could not find node for ${url}`);

		return { module, module_node, url };
	}

	async function update_manifest() {
		try {
			({ manifest_data } = await sync.create(svelte_config));

			if (manifest_error) {
				manifest_error = null;
				vite.ws.send({ type: 'full-reload' });
			}
		} catch (error) {
			manifest_error = /** @type {Error} */ (error);

			console.error(colors.bold().red(manifest_error.message));
			vite.ws.send({
				type: 'error',
				err: {
					message: manifest_error.message ?? 'Invalid routes',
					stack: ''
				}
			});

			return;
		}

		manifest = {
			appDir: svelte_config.kit.appDir,
			appPath: svelte_config.kit.appDir,
			assets: new Set(manifest_data.assets.map((asset) => asset.file)),
			mimeTypes: get_mime_lookup(manifest_data),
			_: {
				client: {
					start: `${runtime_base}/client/start.js`,
					app: `${to_fs(svelte_config.kit.outDir)}/generated/client/app.js`,
					imports: [],
					stylesheets: [],
					fonts: []
				},
				nodes: manifest_data.nodes.map((node, index) => {
					return async () => {
						/** @type {import('types').SSRNode} */
						const result = {};

						/** @type {import('vite').ModuleNode[]} */
						const module_nodes = [];

						result.index = index;

						// these are unused in dev, it's easier to include them
						result.imports = [];
						result.stylesheets = [];
						result.fonts = [];

						if (node.component) {
							result.component = async () => {
								const { module_node, module } = await resolve(
									/** @type {string} */ (node.component)
								);

								module_nodes.push(module_node);

								return module.default;
							};
						}

						if (node.universal) {
							const { module, module_node } = await resolve(node.universal);

							module_nodes.push(module_node);

							result.universal = module;
							result.universal_id = node.universal;
						}

						if (node.server) {
							const { module } = await resolve(node.server);
							result.server = module;
							result.server_id = node.server;
						}

						// in dev we inline all styles to avoid FOUC. this gets populated lazily so that
						// components/stylesheets loaded via import() during `load` are included
						result.inline_styles = async () => {
							const deps = new Set();

							for (const module_node of module_nodes) {
								await find_deps(vite, module_node, deps);
							}

							/** @type {Record<string, string>} */
							const styles = {};

							for (const dep of deps) {
								const url = new URL(dep.url, 'dummy:/');
								const query = url.searchParams;

								if (
									(isCSSRequest(dep.file) ||
										(query.has('svelte') && query.get('type') === 'style')) &&
									!(query.has('raw') || query.has('url') || query.has('inline'))
								) {
									try {
										query.set('inline', '');
										const mod = await vite.ssrLoadModule(
											`${decodeURI(url.pathname)}${url.search}${url.hash}`
										);
										styles[dep.url] = mod.default;
									} catch {
										// this can happen with dynamically imported modules, I think
										// because the Vite module graph doesn't distinguish between
										// static and dynamic imports? TODO investigate, submit fix
									}
								}
							}

							return styles;
						};

						return result;
					};
				}),
				routes: compact(
					manifest_data.routes.map((route) => {
						if (!route.page && !route.endpoint) return null;

						const endpoint = route.endpoint;

						return {
							id: route.id,
							pattern: route.pattern,
							params: route.params,
							page: route.page,
							endpoint: endpoint
								? async () => {
										const url = path.resolve(cwd, endpoint.file);
										return await loud_ssr_load_module(url);
								  }
								: null,
							endpoint_id: endpoint?.file
						};
					})
				),
				matchers: async () => {
					/** @type {Record<string, import('@sveltejs/kit').ParamMatcher>} */
					const matchers = {};

					for (const key in manifest_data.matchers) {
						const file = manifest_data.matchers[key];
						const url = path.resolve(cwd, file);
						const module = await vite.ssrLoadModule(url);

						if (module.match) {
							matchers[key] = module.match;
						} else {
							throw new Error(`${file} does not export a \`match\` function`);
						}
					}

					return matchers;
				}
			}
		};
	}

	/** @param {string} stack */
	function fix_stack_trace(stack) {
		return stack ? vite.ssrRewriteStacktrace(stack) : stack;
	}

	await update_manifest();

	/**
	 * @param {string} event
	 * @param {(file: string) => void} cb
	 */
	const watch = (event, cb) => {
		vite.watcher.on(event, (file) => {
			if (
				file.startsWith(svelte_config.kit.files.routes + path.sep) ||
				file.startsWith(svelte_config.kit.files.params + path.sep) ||
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
	watch('add', () => debounce(update_manifest));
	watch('unlink', () => debounce(update_manifest));
	watch('change', (file) => {
		// Don't run for a single file if the whole manifest is about to get updated
		if (timeout || restarting) return;

		sync.update(svelte_config, manifest_data, file);
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
			sync.server(svelte_config);
		}
	});

	// changing the svelte config requires restarting the dev server
	// the config is only read on start and passed on to vite-plugin-svelte
	// which needs up-to-date values to operate correctly
	vite.watcher.on('change', (file) => {
		if (path.basename(file) === 'svelte.config.js') {
			console.log(`svelte config changed, restarting vite dev-server. changed file: ${file}`);
			restarting = true;
			vite.restart();
		}
	});

	const assets = svelte_config.kit.paths.assets ? SVELTE_KIT_ASSETS : svelte_config.kit.paths.base;
	const asset_server = sirv(svelte_config.kit.files.assets, {
		dev: true,
		etag: true,
		maxAge: 0,
		extensions: [],
		setHeaders: (res) => {
			res.setHeader('access-control-allow-origin', '*');
		}
	});

	async function align_exports() {
		// This shameful hack allows us to load runtime server code via Vite
		// while apps load `HttpError` and `Redirect` in Node, without
		// causing `instanceof` checks to fail
		const control_module_node = await import('../../../runtime/control.js');
		const control_module_vite = await vite.ssrLoadModule(`${runtime_base}/control.js`);

		control_module_node.replace_implementations({
			ActionFailure: control_module_vite.ActionFailure,
			HttpError: control_module_vite.HttpError,
			Redirect: control_module_vite.Redirect
		});
	}
	align_exports();
	const ws_send = vite.ws.send;
	/** @param {any} args */
	vite.ws.send = function (...args) {
		// We need to reapply the patch after Vite did dependency optimizations
		// because that clears the module resolutions
		if (args[0]?.type === 'full-reload' && args[0].path === '*') {
			align_exports();
		}
		return ws_send.apply(vite.ws, args);
	};

	vite.middlewares.use(async (req, res, next) => {
		try {
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
		} catch (e) {
			const error = coalesce_to_error(e);
			res.statusCode = 500;
			res.end(fix_stack_trace(/** @type {string} */ (error.stack)));
		}
	});

	const env = loadEnv(vite_config.mode, svelte_config.kit.env.dir, '');

	return () => {
		const serve_static_middleware = vite.middlewares.stack.find(
			(middleware) =>
				/** @type {function} */ (middleware.handle).name === 'viteServeStaticMiddleware'
		);

		// Vite will give a 403 on URLs like /test, /static, and /package.json preventing us from
		// serving routes with those names. See https://github.com/vitejs/vite/issues/7363
		remove_static_middlewares(vite.middlewares);

		vite.middlewares.use(async (req, res) => {
			// Vite's base middleware strips out the base path. Restore it
			const original_url = req.url;
			req.url = req.originalUrl;
			try {
				const base = `${vite.config.server.https ? 'https' : 'http'}://${
					req.headers[':authority'] || req.headers.host
				}`;

				const decoded = decodeURI(new URL(base + req.url).pathname);
				const file = posixify(path.resolve(decoded.slice(svelte_config.kit.paths.base.length + 1)));
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
						res.end(`import '${to_fs(resolved)}';`);
					} else {
						res.writeHead(404);
						res.end('not found');
					}

					return;
				}

				// we have to import `Server` before calling `set_assets`
				const { Server } = /** @type {import('types').ServerModule} */ (
					await vite.ssrLoadModule(`${runtime_base}/server/index.js`)
				);

				const { set_fix_stack_trace } = await vite.ssrLoadModule(
					`${runtime_base}/shared-server.js`
				);
				set_fix_stack_trace(fix_stack_trace);

				const { set_assets } = await vite.ssrLoadModule('__sveltekit/paths');
				set_assets(assets);

				const server = new Server(manifest);

				await server.init({ env });

				let request;

				try {
					request = await getRequest({
						base,
						request: req
					});
				} catch (/** @type {any} */ err) {
					res.statusCode = err.status || 400;
					return res.end('Invalid request body');
				}

				if (manifest_error) {
					console.error(colors.bold().red(manifest_error.message));

					const error_page = load_error_page(svelte_config);

					/** @param {{ status: number; message: string }} opts */
					const error_template = ({ status, message }) => {
						return error_page
							.replace(/%sveltekit\.status%/g, String(status))
							.replace(/%sveltekit\.error\.message%/g, message);
					};

					res.writeHead(500, {
						'Content-Type': 'text/html; charset=utf-8'
					});
					res.end(
						error_template({ status: 500, message: manifest_error.message ?? 'Invalid routes' })
					);

					return;
				}

				const rendered = await server.respond(request, {
					getClientAddress: () => {
						const { remoteAddress } = req.socket;
						if (remoteAddress) return remoteAddress;
						throw new Error('Could not determine clientAddress');
					},
					read: (file) => fs.readFileSync(path.join(svelte_config.kit.files.assets, file))
				});

				if (rendered.status === 404) {
					// @ts-expect-error
					serve_static_middleware.handle(req, res, () => {
						setResponse(res, rendered);
					});
				} else {
					setResponse(res, rendered);
				}
			} catch (e) {
				const error = coalesce_to_error(e);
				res.statusCode = 500;
				res.end(fix_stack_trace(/** @type {string} */ (error.stack)));
			}
		});
	};
}

/**
 * @param {import('connect').Server} server
 */
function remove_static_middlewares(server) {
	const static_middlewares = ['viteServeStaticMiddleware'];
	for (let i = server.stack.length - 1; i > 0; i--) {
		// @ts-expect-error using internals
		if (static_middlewares.includes(server.stack[i].handle.name)) {
			server.stack.splice(i, 1);
		}
	}
}

/**
 * @param {import('vite').ViteDevServer} vite
 * @param {import('vite').ModuleNode} node
 * @param {Set<import('vite').ModuleNode>} deps
 */
async function find_deps(vite, node, deps) {
	// since `ssrTransformResult.deps` contains URLs instead of `ModuleNode`s, this process is asynchronous.
	// instead of using `await`, we resolve all branches in parallel.
	/** @type {Promise<void>[]} */
	const branches = [];

	/** @param {import('vite').ModuleNode} node */
	async function add(node) {
		if (!deps.has(node)) {
			deps.add(node);
			await find_deps(vite, node, deps);
		}
	}

	/** @param {string} url */
	async function add_by_url(url) {
		const node = await vite.moduleGraph.getModuleByUrl(url);

		if (node) {
			await add(node);
		}
	}

	if (node.ssrTransformResult) {
		if (node.ssrTransformResult.deps) {
			node.ssrTransformResult.deps.forEach((url) => branches.push(add_by_url(url)));
		}

		if (node.ssrTransformResult.dynamicDeps) {
			node.ssrTransformResult.dynamicDeps.forEach((url) => branches.push(add_by_url(url)));
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
