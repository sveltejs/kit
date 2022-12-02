import fs from 'fs';
import colors from 'kleur';
import path from 'path';
import sirv from 'sirv';
import { URL } from 'url';
import { getRequest, setResponse } from '../../../exports/node/index.js';
import { installPolyfills } from '../../../exports/node/polyfills.js';
import { coalesce_to_error } from '../../../utils/error.js';
import { posixify, resolve_entry, to_fs } from '../../../utils/filesystem.js';
import { load_error_page, load_template } from '../../../core/config/index.js';
import { SVELTE_KIT_ASSETS } from '../../../constants.js';
import * as sync from '../../../core/sync/sync.js';
import { get_mime_lookup, runtime_base, runtime_prefix } from '../../../core/utils.js';
import { compact } from '../../../utils/array.js';

// Vite doesn't expose this so we just copy the list for now
// https://github.com/vitejs/vite/blob/3edd1af56e980aef56641a5a51cf2932bb580d41/packages/vite/src/node/plugins/css.ts#L96
const style_pattern = /\.(css|less|sass|scss|styl|stylus|pcss|postcss)$/;

const cwd = process.cwd();

/**
 * @param {import('vite').ViteDevServer} vite
 * @param {import('vite').ResolvedConfig} vite_config
 * @param {import('types').ValidatedConfig} svelte_config
 * @return {Promise<Promise<() => void>>}
 */
export async function dev(vite, vite_config, svelte_config) {
	installPolyfills();

	// @ts-expect-error
	globalThis.__SVELTEKIT_BROWSER__ = false;

	sync.init(svelte_config, vite_config.mode);

	/** @type {import('types').Respond} */
	const respond = (await import(`${runtime_prefix}/server/index.js`)).respond;

	/** @type {import('types').ManifestData} */
	let manifest_data;
	/** @type {import('types').SSRManifest} */
	let manifest;

	/** @param {string} id */
	async function resolve(id) {
		const url = id.startsWith('..') ? `/@fs${path.posix.resolve(id)}` : `/${id}`;

		const module = await vite.ssrLoadModule(url);

		const module_node = await vite.moduleGraph.getModuleByUrl(url);
		if (!module_node) throw new Error(`Could not find node for ${url}`);

		return { module, module_node, url };
	}

	async function update_manifest() {
		({ manifest_data } = await sync.create(svelte_config));

		manifest = {
			appDir: svelte_config.kit.appDir,
			appPath: svelte_config.kit.appDir,
			assets: new Set(manifest_data.assets.map((asset) => asset.file)),
			mimeTypes: get_mime_lookup(manifest_data),
			_: {
				entry: {
					file: `/@fs${runtime_prefix}/client/start.js`,
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
								const { module_node, module, url } = await resolve(
									/** @type {string} */ (node.component)
								);

								module_nodes.push(module_node);
								result.file = url.endsWith('.svelte') ? url : url + '?import'; // TODO what is this for?

								return module.default;
							};
						}

						if (node.shared) {
							const { module, module_node } = await resolve(node.shared);

							module_nodes.push(module_node);

							result.shared = module;
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
								const parsed = new URL(dep.url, 'http://localhost/');
								const query = parsed.searchParams;

								if (
									style_pattern.test(dep.file) ||
									(query.has('svelte') && query.get('type') === 'style')
								) {
									try {
										const mod = await vite.ssrLoadModule(dep.url);
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
										return await vite.ssrLoadModule(url);
								  }
								: null
						};
					})
				),
				matchers: async () => {
					/** @type {Record<string, import('types').ParamMatcher>} */
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

	/** @param {Error} error */
	function fix_stack_trace(error) {
		return error.stack ? vite.ssrRewriteStacktrace(error.stack) : error.stack;
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

	// Debounce add/unlink events because in case of folder deletion or moves
	// they fire in rapid succession, causing needless invocations.
	watch('add', () => debounce(update_manifest));
	watch('unlink', () => debounce(update_manifest));
	watch('change', (file) => {
		// Don't run for a single file if the whole manifest is about to get updated
		if (timeout) return;

		sync.update(svelte_config, manifest_data, file);
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
			res.end(fix_stack_trace(error));
		}
	});

	// set `import { version } from '$app/environment'`
	(await vite.ssrLoadModule(`${runtime_prefix}/env.js`)).set_version(
		svelte_config.kit.version.name
	);

	return () => {
		const serve_static_middleware = vite.middlewares.stack.find(
			(middleware) =>
				/** @type {function} */ (middleware.handle).name === 'viteServeStaticMiddleware'
		);

		remove_static_middlewares(vite.middlewares);

		vite.middlewares.use(async (req, res) => {
			// Vite's base middleware strips out the base path. Restore it
			req.url = req.originalUrl;
			try {
				const base = `${vite.config.server.https ? 'https' : 'http'}://${
					req.headers[':authority'] || req.headers.host
				}`;

				const decoded = decodeURI(new URL(base + req.url).pathname);
				const file = posixify(path.resolve(decoded.slice(1)));
				const is_file = fs.existsSync(file) && !fs.statSync(file).isDirectory();
				const allowed =
					!vite_config.server.fs.strict ||
					vite_config.server.fs.allow.some((dir) => file.startsWith(dir));

				if (is_file && allowed) {
					// @ts-expect-error
					serve_static_middleware.handle(req, res);
					return;
				}

				if (!decoded.startsWith(svelte_config.kit.paths.base)) {
					return not_found(
						res,
						`Not found (did you mean ${svelte_config.kit.paths.base + req.url}?)`
					);
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

				const hooks_file = svelte_config.kit.files.hooks.server;
				/** @type {Partial<import('types').ServerHooks>} */
				const user_hooks = resolve_entry(hooks_file)
					? await vite.ssrLoadModule(`/${hooks_file}`)
					: {};

				// TODO remove for 1.0
				if (!resolve_entry(hooks_file)) {
					const old_file = resolve_entry(path.join(process.cwd(), 'src', 'hooks'));
					if (old_file && fs.existsSync(old_file)) {
						throw new Error(
							`Rename your server hook file from ${posixify(
								path.relative(process.cwd(), old_file)
							)} to ${posixify(
								path.relative(process.cwd(), svelte_config.kit.files.hooks.server)
							)}${path.extname(
								old_file
							)} (because there's also client hooks now). See the PR for more information: https://github.com/sveltejs/kit/pull/6586`
						);
					}
				}

				const handle = user_hooks.handle || (({ event, resolve }) => resolve(event));

				// TODO remove for 1.0
				// @ts-expect-error
				if (user_hooks.externalFetch) {
					throw new Error(
						'externalFetch has been removed — use handleFetch instead. See https://github.com/sveltejs/kit/pull/6565 for details'
					);
				}

				/** @type {import('types').ServerHooks} */
				const hooks = {
					handle,
					handleError:
						user_hooks.handleError ||
						(({ error: e }) => {
							const error = /** @type {Error & { frame?: string }} */ (e);
							console.error(colors.bold().red(error.message ?? error)); // Could be anything
							if (error.frame) {
								console.error(colors.gray(error.frame));
							}
							if (error.stack) {
								console.error(colors.gray(error.stack));
							}
						}),
					handleFetch: user_hooks.handleFetch || (({ request, fetch }) => fetch(request))
				};

				if (/** @type {any} */ (hooks).getContext) {
					// TODO remove this for 1.0
					throw new Error(
						'The getContext hook has been removed. See https://kit.svelte.dev/docs/hooks'
					);
				}

				if (/** @type {any} */ (hooks).serverFetch) {
					// TODO remove this for 1.0
					throw new Error('The serverFetch hook has been renamed to externalFetch.');
				}

				// TODO the / prefix will probably fail if outDir is outside the cwd (which
				// could be the case in a monorepo setup), but without it these modules
				// can get loaded twice via different URLs, which causes failures. Might
				// require changes to Vite to fix
				const { default: root } = await vite.ssrLoadModule(
					`/${posixify(path.relative(cwd, `${svelte_config.kit.outDir}/generated/root.svelte`))}`
				);

				const paths = await vite.ssrLoadModule(`${runtime_base}/paths.js`);

				paths.set_paths({
					base: svelte_config.kit.paths.base,
					assets
				});

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

				const template = load_template(cwd, svelte_config);
				const error_page = load_error_page(svelte_config);

				const rendered = await respond(
					request,
					{
						csp: svelte_config.kit.csp,
						csrf: {
							check_origin: svelte_config.kit.csrf.checkOrigin
						},
						dev: true,
						handle_error: async (error, event) => {
							const error_object = await hooks.handleError({
								error: new Proxy(error, {
									get: (target, property) => {
										if (property === 'stack') {
											return fix_stack_trace(error);
										}

										return Reflect.get(target, property, target);
									}
								}),
								event,

								// TODO remove for 1.0
								// @ts-expect-error
								get request() {
									throw new Error(
										'request in handleError has been replaced with event. See https://github.com/sveltejs/kit/pull/3384 for details'
									);
								}
							});
							return (
								error_object ?? { message: event.route.id != null ? 'Internal Error' : 'Not Found' }
							);
						},
						hooks,
						manifest,
						paths: {
							base: svelte_config.kit.paths.base,
							assets
						},
						public_env: {},
						read: (file) => fs.readFileSync(path.join(svelte_config.kit.files.assets, file)),
						root,
						app_template: ({ head, body, assets, nonce }) => {
							return (
								template
									.replace(/%sveltekit\.assets%/g, assets)
									.replace(/%sveltekit\.nonce%/g, nonce)
									// head and body must be replaced last, in case someone tries to sneak in %sveltekit.assets% etc
									.replace('%sveltekit.head%', () => head)
									.replace('%sveltekit.body%', () => body)
							);
						},
						app_template_contains_nonce: template.includes('%sveltekit.nonce%'),
						error_template: ({ status, message }) => {
							return error_page
								.replace(/%sveltekit\.status%/g, String(status))
								.replace(/%sveltekit\.error\.message%/g, message);
						},
						service_worker:
							svelte_config.kit.serviceWorker.register &&
							!!resolve_entry(svelte_config.kit.files.serviceWorker),
						version: svelte_config.kit.version.name
					},
					{
						getClientAddress: () => {
							const { remoteAddress } = req.socket;
							if (remoteAddress) return remoteAddress;
							throw new Error('Could not determine clientAddress');
						}
					}
				);

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
				res.end(fix_stack_trace(error));
			}
		});
	};
}

/** @param {import('http').ServerResponse} res */
function not_found(res, message = 'Not found') {
	res.statusCode = 404;
	res.end(message);
}

/**
 * @param {import('connect').Server} server
 */
function remove_static_middlewares(server) {
	// We don't use viteServePublicMiddleware because of the following issues:
	// https://github.com/vitejs/vite/issues/9260
	// https://github.com/vitejs/vite/issues/9236
	// https://github.com/vitejs/vite/issues/9234
	const static_middlewares = ['viteServePublicMiddleware', 'viteServeStaticMiddleware'];
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
