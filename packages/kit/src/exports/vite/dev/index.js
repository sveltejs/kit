/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { EnvironmentModuleNode, ViteDevServer } from 'vite' */
/** @import { DevRequestInfo, ManifestData, PrerenderOption, RemoteChunk, ServerModule, ValidatedConfig, SSRManifest } from 'types' */
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { AsyncLocalStorage } from 'node:async_hooks';
import { styleText } from 'node:util';
import sirv from 'sirv';
import {
	find_deps,
	generate_manifest,
	loud_ssr_load_module,
	vite_css_query_regex
} from './generate_manifest.js';
import { generate_server_manifest_code, to_code } from './server_manifest_code.js';
import { write_if_changed } from '../../../core/sync/utils.js';
import { createReadableStream, getRequest, setResponse } from '../../../exports/node/index.js';
import { coalesce_to_error, set_error_stack } from '../../../utils/error.js';
import { resolve_entry } from '../../../utils/filesystem.js';
import { load_and_validate_params } from '../../../core/params.js';
import { from_fs, to_fs } from '../../../utils/vite.js';
import { posixify } from '../../../utils/os.js';
import { load_error_page } from '../../../core/config/index.js';
import {
	DEV_INFO_HEADER,
	DEV_INLINE_STYLES_PATH,
	DEV_REMOTE_PATH,
	DEV_SERVER_ASSETS_PATH,
	SRC_ROOT,
	SVELTE_KIT_ASSETS
} from '../../../constants.js';
import * as sync from '../../../core/sync/sync.js';
import { get_runtime_base } from '../../../core/utils.js';
import '../../../utils/mime.js'; // extend mrmime with additional types (affects sirv too)
import {
	get_dev_origin,
	is_chrome_devtools_request,
	is_remote_module,
	not_found
} from '../utils.js';
import { SCHEME } from '../../../utils/url.js';
import { check_feature } from '../../../core/features.js';
import * as e from '../../../messages/build-errors.js';
import { escape_html } from '../../../utils/escape.js';
import { get_runner } from '../../../runner.js';
import { write_server } from '../../../core/sync/write_server.js';
import { write_tsconfig } from '../../../core/sync/write_tsconfig/index.js';
import create_manifest_data from '../../../core/sync/create_manifest_data/index.js';

/**
 * @param {typeof import('vite')} vite the peer resolved vite module
 * @param {ViteDevServer} vite_dev_server
 * @param {ValidatedConfig} svelte_config
 * @param {() => RemoteChunk[]} get_remotes
 * @param {string} root The project root directory
 * @param {(manifest_data: ManifestData) => void} set_manifest_data
 * @return {Promise<Promise<() => void>>}
 */
export async function dev(
	vite,
	vite_dev_server,
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
			svelte_config.adapter
		);
	};

	const fetch = globalThis.fetch;
	globalThis.fetch = (info, init) => {
		if (typeof info === 'string' && !SCHEME.test(info)) {
			e.fetch_relative_url({ url: info });
		}

		return fetch(info, init);
	};

	write_tsconfig(svelte_config, root);

	// for code outside the vite process, which imports it once the server listens
	const write_origin = () =>
		write_if_changed(
			path.join(svelte_config.outDir, 'generated', 'dev', 'origin.js'),
			`export const origin = ${to_code(get_dev_origin(vite_dev_server))};\n`
		);
	write_origin();
	vite_dev_server.httpServer?.on('listening', write_origin);

	/** @type {ManifestData} */
	let manifest_data;
	/** @type {SSRManifest} */
	let manifest;

	/** @type {Error | null} */
	let manifest_error = null;

	const runner = get_runner(vite, vite_dev_server);
	const { hot } = vite_dev_server.environments.client;

	/**
	 * Log a response to the console, routed through Vite's logger so that it
	 * respects the configured `logLevel` and any `customLogger`
	 * @param {number} status
	 * @param {string} log
	 */
	function log_dev_response(status, log) {
		if (status < 400) {
			vite_dev_server.config.logger.info(log);
		} else {
			vite_dev_server.config.logger.error(log);
		}
	}

	/** @param {boolean} [validate_params] */
	async function update_manifest(validate_params = true) {
		try {
			manifest_data = create_manifest_data(svelte_config, root);
			sync.create(svelte_config, root, manifest_data, false);
			set_manifest_data(manifest_data);

			// written before the first request, which another vite environment may handle on its own
			write_if_changed(
				path.join(svelte_config.outDir, 'generated', 'dev', 'server-manifest.js'),
				generate_server_manifest_code(
					generate_manifest(
						vite,
						vite_dev_server,
						runner,
						svelte_config,
						manifest_data,
						root,
						get_remotes
					),
					manifest_data,
					svelte_config,
					root
				)
			);

			if (!validate_params) return;

			await load_and_validate_params({
				routes: manifest_data.routes,
				params_path: manifest_data.params,
				root,
				load: (file) => loud_ssr_load_module(vite, vite_dev_server, runner, file)
			});

			if (manifest_error) {
				manifest_error = null;
				hot.send({ type: 'full-reload' });
			}
		} catch (error) {
			manifest_error = /** @type {Error} */ (error);

			console.error(styleText(['bold', 'red'], manifest_error.message));
			hot.send({
				type: 'error',
				err: {
					message: manifest_error.message ?? 'Invalid routes',
					stack: ''
				}
			});

			return;
		}

		manifest = generate_manifest(
			vite,
			vite_dev_server,
			runner,
			svelte_config,
			manifest_data,
			root,
			get_remotes
		);
	}

	// Initializing the Vite SSR runner before the server starts is unsafe, but generated types
	// don't depend on it and should be available as soon as the dev server is ready.
	await update_manifest(false);

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

		return set_error_stack(error, prelude + lines.join('\n'));
	}

	const params_file = resolve_entry(svelte_config.files.params, svelte_config.moduleExtensions);

	/**
	 * @param {string} event
	 * @param {(file: string) => void} cb
	 */
	const watch = (event, cb) => {
		vite_dev_server.watcher.on(event, (file) => {
			if (
				file.startsWith(svelte_config.files.routes + path.sep) ||
				file.startsWith(svelte_config.files.assets + path.sep) ||
				(params_file && file === params_file) ||
				is_remote_module(file) ||
				// in contrast to server hooks, client hooks are written to the client manifest
				// and therefore need rebuilding when they are added/removed
				file.startsWith(svelte_config.files.hooks.client)
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
		// `manifest_data` may be undefined if initial manifest creation failed. In that case
		// there's nothing to update — the manifest will be created from scratch on the first request.
		if (!manifest_data) return;
		// Don't run for a single file if the whole manifest is about to get updated
		// Unless it's a file where the trailing slash page option might have changed
		if (timeout || !/\+(page|layout|server).*$/.test(file)) return;
		if (!sync.update(svelte_config, manifest_data, file, root)) debounce(update_manifest);
	});

	const { appTemplate, errorTemplate, serviceWorker, hooks } = svelte_config.files;

	// vite client only executes a full reload if the triggering html file path is index.html
	// kit defaults to src/app.html, so unless user changed that to index.html
	// send the vite client a full-reload event without path being set
	if (appTemplate !== 'index.html') {
		vite_dev_server.watcher.on('change', (file) => {
			if (file === appTemplate) {
				hot.send({ type: 'full-reload' });
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
			write_server(svelte_config, path.join(svelte_config.outDir, 'generated', 'dev'), root);
		}
	});

	/**
	 * finds what a module depends on in the server environments that have it, since a dev server
	 * in another environment does not know which one it runs in
	 * @param {string} id the file path or url of the module
	 * @returns {Promise<Set<EnvironmentModuleNode> | undefined>}
	 */
	async function find_server_deps(id) {
		/** @type {Set<EnvironmentModuleNode> | undefined} */
		let deps;

		for (const environment of Object.values(vite_dev_server.environments)) {
			if (environment.config.consumer !== 'server') continue;

			const node =
				environment.moduleGraph.getModuleById(id) ??
				(await environment.moduleGraph.getModuleByUrl(id));

			if (node) await find_deps(environment, node, (deps ??= new Set()));
		}

		return deps;
	}

	// returns the css a module depends on, for servers in other vite environments
	vite_dev_server.middlewares.use(
		DEV_INLINE_STYLES_PATH,
		catch_errors(async (req, res) => {
			const url = new URL(req.originalUrl ?? '', 'http://localhost');

			/** @type {Map<string, string>} */
			const styles = new Map();
			for (const module of url.searchParams.getAll('module')) {
				for (const dep of (await find_server_deps(module)) ?? []) {
					if (vite.isCSSRequest(dep.url) && !vite_css_query_regex.test(dep.url)) {
						styles.set(
							dep.url,
							dep.url.includes('?') ? dep.url.replace('?', '?inline&') : dep.url + '?inline'
						);
					}
				}
			}

			res.setHeader('content-type', 'application/json');
			res.end(JSON.stringify(Array.from(styles, ([url, inline]) => ({ url, inline }))));
		})
	);

	// returns the sizes of the assets a server module imports, for servers that cannot read files
	vite_dev_server.middlewares.use(
		DEV_SERVER_ASSETS_PATH,
		catch_errors(async (req, res) => {
			const url = new URL(req.originalUrl ?? '', 'http://localhost');
			const id = url.searchParams.get('module');
			const deps = id ? await find_server_deps(id) : undefined;

			if (!deps) {
				res.statusCode = 404;
				res.end();
				return;
			}

			/** @type {Record<string, number>} */
			const sizes = {};
			for (const dep of deps) {
				if (
					!dep.file ||
					vite.isCSSRequest(dep.file) ||
					/\.(?:[cm]?[jt]sx?|svelte)$/.test(dep.file)
				) {
					continue;
				}

				/** @type {fs.Stats} */
				let stats;
				try {
					stats = fs.statSync(dep.file);
				} catch {
					continue;
				}
				if (!stats.isFile()) continue;

				// the same path read gets from the asset url
				const relative = posixify(path.relative(root, dep.file));
				const file =
					relative.startsWith('../') || path.isAbsolute(relative)
						? `/@fs${posixify(dep.file)}`
						: relative;

				sizes[file] = stats.size;
			}

			res.setHeader('content-type', 'application/json');
			res.end(JSON.stringify(sizes));
		})
	);

	// returns the file of a remote module, for servers in other vite environments
	vite_dev_server.middlewares.use(DEV_REMOTE_PATH, (req, res) => {
		const url = new URL(req.originalUrl ?? '', 'http://localhost');
		const hash = url.searchParams.get('hash');
		const remote = get_remotes().find((remote) => remote.hash === hash);
		const file = remote && path.resolve(root, remote.file);

		if (!file || !fs.existsSync(file)) {
			res.statusCode = 404;
			res.end();
			return;
		}

		res.setHeader('content-type', 'application/json');
		res.end(JSON.stringify({ file: to_fs(file) }));
	});

	const assets = svelte_config.paths.assets ? SVELTE_KIT_ASSETS : svelte_config.paths.base;
	const asset_server = sirv(svelte_config.files.assets, {
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
			const file = svelte_config.files.assets + pathname;

			if (fs.existsSync(file) && !fs.statSync(file).isDirectory()) {
				if (has_correct_case(file, svelte_config.files.assets)) {
					req.url = encodeURI(pathname); // don't need query/hash
					asset_server(req, res);
					return;
				}
			}
		}

		next();
	});

	const env = vite.loadEnv(vite_dev_server.config.mode, svelte_config.env.dir, '');
	const emulator = await svelte_config.adapter?.emulate?.();

	/** @type {Promise<void> | undefined} */
	let init_manifest;

	return () => {
		const serve_static_middleware = vite_dev_server.middlewares.stack.find(
			(middleware) =>
				/** @type {Function} */ (middleware.handle).name === 'viteServeStaticMiddleware'
		);

		// Vite's static middleware would serve project files at URLs like /test, /static and
		// /package.json before our routes get a chance. See https://github.com/vitejs/vite/issues/7363
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
					path.resolve(root, decoded.slice(svelte_config.paths.base.length + 1))
				);
				const is_file = fs.existsSync(file) && !fs.statSync(file).isDirectory();
				const allowed =
					!vite_dev_server.config.server.fs.strict ||
					vite_dev_server.config.server.fs.allow.some((dir) => file.startsWith(dir));

				if (is_file && allowed) {
					req.url = original_url;
					// @ts-expect-error
					serve_static_middleware.handle(req, res);
					return;
				}

				if (is_chrome_devtools_request(decoded, res)) {
					return;
				}

				if (!decoded.startsWith(svelte_config.paths.base)) {
					return not_found(req, res, svelte_config.paths.base);
				}

				if (decoded === svelte_config.paths.base + '/service-worker.js') {
					const resolved = resolve_entry(
						svelte_config.files.serviceWorker,
						svelte_config.moduleExtensions
					);

					if (resolved) {
						res.writeHead(200, {
							'content-type': 'application/javascript'
						});
						res.end(`import '${svelte_config.paths.base}${to_fs(resolved)}';`);
					} else {
						res.writeHead(404);
						res.end('not found');
					}

					return;
				}

				// resolve the instrumentation file per request so that changes to it
				// are picked up on new requests
				const resolved_instrumentation = resolve_entry(
					path.join(svelte_config.files.src, 'instrumentation.server'),
					svelte_config.moduleExtensions
				);

				if (
					resolved_instrumentation &&
					svelte_config.adapter &&
					!svelte_config.adapter.supports?.instrumentation?.()
				) {
					e.adapter_instrumentation_unsupported({
						file: resolved_instrumentation,
						adapter: svelte_config.adapter.name
					});
				}

				const { configure, format_response } = /** @type {ServerModule} */ (
					await runner.import(`${get_runtime_base(root)}/server/index.js`)
				);

				const request = (svelte_config.adapter?.vite?.getRequest ?? getRequest)({
					base,
					request: req,
					response: res
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

				const getClientAddress = () => {
					const { remoteAddress } = req.socket;
					if (remoteAddress) return remoteAddress;
					throw new Error('Could not determine clientAddress');
				};

				const adapter_respond = svelte_config.adapter?.vite?.respond;

				// whether this process rendered the request and so loaded its modules
				let rendered_here = !adapter_respond;

				/**
				 * renders the request in this process
				 * @param {Request} request
				 */
				const resolve = async (request) => {
					rendered_here = true;

					if (resolved_instrumentation) {
						const { set_env } = await runner.import('<sveltekit:generated>/env/config.js');
						set_env(env);
						await runner.import(resolved_instrumentation);
					}

					const { init, respond } = await configure({
						manifest,
						env,
						read: (file) => createReadableStream(from_fs(file)),
						assets,
						fix_stack_trace
					});

					await init();

					return respond(request, {
						getClientAddress,
						read: (file) => {
							if (file in manifest.server_assets) {
								return fs.readFileSync(from_fs(file));
							}

							return fs.readFileSync(path.join(svelte_config.files.assets, file));
						},
						before_handle: async (event, config, prerender, handle) => {
							// we need to use .run because .enterWith() is not supported in Cloudflare Workers
							// see https://blog.cloudflare.com/workers-node-js-asynclocalstorage/
							return await async_local_storage.run({ event, config, prerender }, handle);
						},
						emulator
					});
				};

				const { response: rendered, info } = adapter_respond
					? read_dev_info(await adapter_respond(request, { getClientAddress, resolve }))
					: { response: await resolve(request), info: undefined };

				// a server in another environment reports the remote function, so the log does not load it here
				/** @type {Parameters<ServerModule['format_response']>[3]} */
				const get_remote = rendered_here
					? undefined
					: () =>
							Promise.resolve(
								info?.remote && {
									fn: /** @type {any} */ ({ __: info.remote }),
									name: info.remote.name,
									additional_args: ''
								}
							);

				if (rendered.status === 404) {
					// @ts-expect-error
					serve_static_middleware.handle(req, res, async () => {
						log_dev_response(
							rendered.status,
							await format_response(rendered.status, request, manifest, get_remote)
						);
						(svelte_config.adapter?.vite?.setResponse ?? setResponse)(res, rendered);
					});
				} else {
					log_dev_response(
						rendered.status,
						await format_response(rendered.status, request, manifest, get_remote)
					);
					(svelte_config.adapter?.vite?.setResponse ?? setResponse)(res, rendered);
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
 * responds with a 500 when the handler throws, since connect ignores rejected promises and the
 * process would exit
 * @param {(req: import('connect').IncomingMessage, res: import('node:http').ServerResponse) => Promise<void>} handler
 * @returns {import('connect').NextHandleFunction}
 */
function catch_errors(handler) {
	return (req, res) => {
		handler(req, res).catch((error) => {
			console.error(error);
			if (!res.headersSent) res.statusCode = 500;
			res.end();
		});
	};
}

/**
 * reads what a server in another environment reported about a request
 * @param {Response} response
 * @returns {{ response: Response; info: DevRequestInfo | undefined }}
 */
function read_dev_info(response) {
	const header = response.headers.get(DEV_INFO_HEADER);
	if (!header) return { response, info: undefined };

	/** @type {DevRequestInfo} */
	const info = JSON.parse(decodeURIComponent(header));

	const stripped = new Response(response.body, response);
	stripped.headers.delete(DEV_INFO_HEADER);
	return { response: stripped, info };
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
