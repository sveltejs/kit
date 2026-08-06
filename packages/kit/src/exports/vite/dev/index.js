/** @import { RequestEvent, SSRManifest } from '@sveltejs/kit' */
/** @import { EnvironmentModuleNode, ErrorPayload, ResolvedConfig, ViteDevServer } from 'vite' */
/** @import { ManifestData, PrerenderOption, RemoteChunk, ServerModule, SSRNode, UniversalNode, ValidatedConfig } from 'types' */
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { AsyncLocalStorage } from 'node:async_hooks';
import { styleText } from 'node:util';
import sirv from 'sirv';
import { createReadableStream, getRequest, setResponse } from '../../../exports/node/index.js';
import { coalesce_to_error } from '../../../utils/error.js';
import { resolve_entry } from '../../../utils/filesystem.js';
import { load_and_validate_params } from '../../../utils/params.js';
import { from_fs, to_fs } from '../../../utils/vite.js';
import { posixify } from '../../../utils/os.js';
import { load_error_page } from '../../../core/config/index.js';
import { SRC_ROOT, SVELTE_KIT_ASSETS } from '../../../constants.js';
import * as sync from '../../../core/sync/sync.js';
import { get_mime_lookup, get_runtime_base } from '../../../core/utils.js';
import '../../../utils/mime.js'; // extend mrmime with additional types (affects sirv too)
import { compact } from '../../../utils/array.js';
import { is_chrome_devtools_request, is_remote_module, log_response, not_found } from '../utils.js';
import { SCHEME } from '../../../utils/url.js';
import { check_feature } from '../../../utils/features.js';
import { escape_html } from '../../../utils/escape.js';
import { get_runner } from '../../../runner.js';

// vite-specifc queries that we should skip handling for css urls
const vite_css_query_regex = /(?:\?|&)(?:raw|url|inline)(?:&|$)/;

/**
 * @param {typeof import('vite')} vite the peer resolved vite module
 * @param {ViteDevServer} vite_dev_server
 * @param {ResolvedConfig} vite_config
 * @param {ValidatedConfig} svelte_config
 * @param {() => RemoteChunk[]} get_remotes
 * @param {string} root The project root directory
 * @param {(manifest_data: ManifestData) => void} set_manifest_data
 * @return {Promise<Promise<() => void>>}
 */
export async function dev(
	vite,
	vite_dev_server,
	vite_config,
	svelte_config,
	get_remotes,
	root,
	set_manifest_data
) {
	/** @type {AsyncLocalStorage<{ event: RequestEvent, config: any, prerender: PrerenderOption }>} */
	const async_local_storage = new AsyncLocalStorage();

	globalThis.__SVELTEKIT_TRACK__ = (label) => {
		const context = async_local_storage.getStore();
		if (!context || context.prerender === true) return;

		check_feature(
			/** @type {string} */ (context.event.route.id),
			context.config,
			label,
			svelte_config.kit.adapter
		);
	};

	const fetch = globalThis.fetch;
	globalThis.fetch = (info, init) => {
		if (typeof info === 'string' && !SCHEME.test(info)) {
			throw new Error(
				`Cannot use relative URL (${info}) with global fetch — use \`event.fetch\` instead: https://svelte.dev/docs/kit/web-standards#fetch-apis`
			);
		}

		return fetch(info, init);
	};

	sync.init(svelte_config, root);

	/** @type {ManifestData} */
	let manifest_data;
	/** @type {SSRManifest} */
	let manifest;

	/** @type {Error | null} */
	let manifest_error = null;

	const runner = get_runner(vite, vite_dev_server);

	/**
	 * @param {string} url
	 * @returns {Promise<Record<string, any>>}
	 */
	async function loud_ssr_load_module(url) {
		try {
			return await runner.import(url);
		} catch (/** @type {any} */ err) {
			const msg = vite.buildErrorMessage(err, [
				styleText('red', `Internal server error: ${err.message}`)
			]);

			if (!vite_dev_server.config.logger.hasErrorLogged(err)) {
				vite_dev_server.config.logger.error(msg, { error: err });
			}

			// TODO this is inadequate — it doesn't reliably show the overlay on every page load,
			// and when it does appear it may immediately vanish. `vite.hot.send` broadcasts
			// to all connected clients, even ones that are unaffected by the error.
			// we need a more considered approach
			vite_dev_server.hot.send({
				type: 'error',
				err: /** @type {ErrorPayload['err']} */ ({
					...err,
					// these properties are non-enumerable and will
					// not be serialized unless we explicitly include them
					message: err.message,
					stack: err.stack ?? ''
				})
			});

			throw err;
		}
	}

	/** @param {string} id */
	async function resolve(id) {
		const url = id.startsWith('..') ? to_fs(path.resolve(id)) : `/${id}`;

		const module = await loud_ssr_load_module(url);

		const module_node = await vite_dev_server.environments.ssr.moduleGraph.getModuleByUrl(url);
		if (!module_node) throw new Error(`Could not find node for ${url}`);

		return { module, module_node, url };
	}

	async function update_manifest() {
		try {
			({ manifest_data } = sync.create(svelte_config, root));
			set_manifest_data(manifest_data);

			await load_and_validate_params({
				routes: manifest_data.routes,
				params_path: manifest_data.params,
				root,
				load: (file) => loud_ssr_load_module(file)
			});

			if (manifest_error) {
				manifest_error = null;
				vite_dev_server.hot.send({ type: 'full-reload' });
			}
		} catch (error) {
			manifest_error = /** @type {Error} */ (error);

			console.error(styleText(['bold', 'red'], manifest_error.message));
			vite_dev_server.hot.send({
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
					start: `${get_runtime_base(root)}/client/entry.js`,
					app: `${to_fs(svelte_config.kit.outDir)}/generated/client/app.js`,
					imports: [],
					stylesheets: [],
					fonts: [],
					uses_env_dynamic_public: true,
					nodes:
						svelte_config.kit.router.resolution === 'client'
							? undefined
							: manifest_data.nodes.map((node, i) => {
									if (node.component || node.universal) {
										return `${svelte_config.kit.paths.base}${to_fs(svelte_config.kit.outDir)}/generated/client/nodes/${i}.js`;
									}
								}),
					// `css` is not necessary in dev, as the JS file from `nodes` will reference the CSS file
					routes:
						svelte_config.kit.router.resolution === 'client'
							? undefined
							: compact(
									manifest_data.routes.map((route) => {
										if (!route.page) return;

										return {
											id: route.id,
											pattern: route.pattern,
											params: route.params,
											layouts: route.page.layouts.map((l) =>
												l !== undefined ? [!!manifest_data.nodes[l].server, l] : undefined
											),
											errors: route.page.errors,
											leaf: [!!manifest_data.nodes[route.page.leaf].server, route.page.leaf]
										};
									})
								)
				},
				server_assets: new Proxy(
					{},
					{
						has: (_, /** @type {string} */ file) => fs.existsSync(from_fs(file)),
						get: (_, /** @type {string} */ file) => fs.statSync(from_fs(file)).size
					}
				),
				nodes: manifest_data.nodes.map((node, index) => {
					return async () => {
						/** @type {SSRNode} */
						const result = {};
						result.index = index;
						result.universal_id = node.universal;
						result.server_id = node.server;

						// these are unused in dev, but it's easier to include them
						result.imports = [];
						result.stylesheets = [];
						result.fonts = [];

						/** @type {EnvironmentModuleNode[]} */
						const module_nodes = [];

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
							if (node.page_options?.ssr === false) {
								result.universal = /** @type {UniversalNode} */ (node.page_options);
							} else {
								// TODO: explain why the file was loaded on the server if we fail to load it
								const { module, module_node } = await resolve(node.universal);
								module_nodes.push(module_node);
								result.universal = module;
							}
						}

						if (node.server) {
							const { module } = await resolve(node.server);
							result.server = module;
						}

						// in dev we inline all styles to avoid FOUC. this gets populated lazily so that
						// components/stylesheets loaded via import() during `load` are included
						result.inline_styles = async () => {
							/** @type {Set<EnvironmentModuleNode>} */
							const deps = new Set();

							for (const module_node of module_nodes) {
								await find_deps(vite_dev_server, module_node, deps);
							}

							/** @type {Record<string, string>} */
							const styles = {};

							for (const dep of deps) {
								if (vite.isCSSRequest(dep.url) && !vite_css_query_regex.test(dep.url)) {
									const inlineCssUrl = dep.url.includes('?')
										? dep.url.replace('?', '?inline&')
										: dep.url + '?inline';
									try {
										const mod = await runner.import(inlineCssUrl);
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
				prerendered_routes: new Set(),
				get remotes() {
					return Object.fromEntries(
						get_remotes().map((remote) => [
							remote.hash,
							() => runner.import(remote.file).then((module) => ({ default: module }))
						])
					);
				},
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
										const url = path.resolve(root, endpoint.file);
										return await loud_ssr_load_module(url);
									}
								: null,
							endpoint_id: endpoint?.file
						};
					})
				),
				matchers: async () => {
					if (!manifest_data.params) return {};

					const url = path.resolve(root, manifest_data.params);
					const module = await runner.import(url);

					if (!module.params) {
						throw new Error(
							`${manifest_data.params} does not export \`params\` from \`defineParams\``
						);
					}

					return module.params;
				}
			}
		};
	}

	/** @param {Error} error */
	function fix_stack_trace(error) {
		if (!error.stack) {
			return;
		}

		let prelude = '';
		let start = -1;
		let end = 0;

		const lines = error.stack
			.replaceAll('\0', '') // remove null bytes from e.g. virtual module IDs, or the response will fail
			.split('\n')
			.map((line, i) => {
				const match = /^ {4}at (?:[^(]+ \((.+)\)|(.+))$/.exec(line);
				if (!match) {
					prelude += line + '\n';
					end = i + 1;
					return line;
				}

				const loc = match[1] ?? match[2];
				const file = loc.replace(/:\d+:\d+$/, '');

				if (fs.existsSync(file)) {
					if (!file.includes('node_modules') && !file.includes(SRC_ROOT)) {
						if (start === -1) start = i;
						end = i + 1;
					}

					return line.replace(file, path.relative(process.cwd(), file));
				}

				return line;
			})
			// if no user-code frame was found, keep only the prelude (message/header)
			// lines and drop everything else so the message isn't duplicated
			.slice(start === -1 ? end : start, end);

		return (error.stack = prelude + lines.join('\n'));
	}

	const params_file = resolve_entry(svelte_config.kit.files.params);

	/**
	 * @param {string} event
	 * @param {(file: string) => void} cb
	 */
	const watch = (event, cb) => {
		vite_dev_server.watcher.on(event, (file) => {
			if (
				file.startsWith(svelte_config.kit.files.routes + path.sep) ||
				file.startsWith(svelte_config.kit.files.assets + path.sep) ||
				(params_file && file === params_file) ||
				is_remote_module(file) ||
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
	});

	const { appTemplate, errorTemplate, serviceWorker, hooks } = svelte_config.kit.files;

	// vite client only executes a full reload if the triggering html file path is index.html
	// kit defaults to src/app.html, so unless user changed that to index.html
	// send the vite client a full-reload event without path being set
	if (appTemplate !== 'index.html') {
		vite_dev_server.watcher.on('change', (file) => {
			if (file === appTemplate) {
				vite_dev_server.hot.send({ type: 'full-reload' });
			}
		});
	}

	vite_dev_server.watcher.on('all', (_, file) => {
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

	vite_dev_server.middlewares.use((req, res, next) => {
		const base = `${vite_dev_server.config.server.https ? 'https' : 'http'}://${
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

	const env = vite.loadEnv(vite_config.mode, svelte_config.kit.env.dir, '');
	const emulator = await svelte_config.kit.adapter?.emulate?.();

	/** @type {Promise<void> | undefined} */
	let init_manifest;

	return () => {
		const serve_static_middleware = vite_dev_server.middlewares.stack.find(
			(middleware) =>
				/** @type {Function} */ (middleware.handle).name === 'viteServeStaticMiddleware'
		);

		// Vite will give a 403 on URLs like /test, /static, and /package.json preventing us from
		// serving routes with those names. See https://github.com/vitejs/vite/issues/7363
		remove_static_middlewares(vite_dev_server.middlewares);

		vite_dev_server.middlewares.use(async (req, res) => {
			// Vite throws a Cannot read properties of undefined (reading 'wrapDynamicImport')
			// if you try to run ssr.runner.import before the server has started so
			// we do it inside here to avoid that
			await (init_manifest ??= update_manifest());

			// Vite's base middleware strips out the base path. Restore it
			const original_url = req.url;
			req.url = req.originalUrl;
			try {
				const base = `${vite_dev_server.config.server.https ? 'https' : 'http'}://${
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

				// resolve the instrumentation file per request so that changes to it
				// are picked up on new requests
				const resolved_instrumentation = resolve_entry(
					path.join(svelte_config.kit.files.src, 'instrumentation.server')
				);

				if (resolved_instrumentation) {
					if (
						svelte_config.kit.adapter &&
						!svelte_config.kit.adapter.supports?.instrumentation?.()
					) {
						throw new Error(
							`${resolved_instrumentation} is unsupported in ${svelte_config.kit.adapter.name}.`
						);
					}

					await runner.import(resolved_instrumentation);
				}

				// we have to import `Server` before calling `set_assets`
				const { Server } = /** @type {ServerModule} */ (
					await runner.import(`${get_runtime_base(root)}/server/index.js`)
				);

				const { set_fix_stack_trace } = await runner.import(
					`${get_runtime_base(root)}/server/internal.js`
				);
				set_fix_stack_trace(fix_stack_trace);

				const { set_assets } = await runner.import('$app/paths/internal/server');
				set_assets(assets);

				const server = new Server(manifest);

				await server.init({
					env,
					read: (file) => createReadableStream(from_fs(file))
				});

				const request = getRequest({
					base,
					request: req
				});

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

				const rendered = await server.respond(request, {
					getClientAddress: () => {
						const { remoteAddress } = req.socket;
						if (remoteAddress) return remoteAddress;
						throw new Error('Could not determine clientAddress');
					},
					read: (file) => {
						if (file in manifest._.server_assets) {
							return fs.readFileSync(from_fs(file));
						}

						return fs.readFileSync(path.join(svelte_config.kit.files.assets, file));
					},
					before_handle: async (event, config, prerender, handle) => {
						// we need to use .run because .enterWith() is not supported in Cloudflare Workers
						// see https://blog.cloudflare.com/workers-node-js-asynclocalstorage/
						return await async_local_storage.run({ event, config, prerender }, handle);
					},
					emulator
				});

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
				console.error(styleText(['bold', 'red'], String(error)));
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
 * @param {ViteDevServer} vite
 * @param {EnvironmentModuleNode} node
 * @param {Set<EnvironmentModuleNode>} deps
 */
async function find_deps(vite, node, deps) {
	// since `transformResult.deps` contains URLs instead of `ModuleNode`s, this process is asynchronous.
	// instead of using `await`, we resolve all branches in parallel.
	/** @type {Promise<void>[]} */
	const branches = [];

	/** @param {EnvironmentModuleNode} node */
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
 * Invalidates a module in all environments.
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
