import { svelte as svelte_plugin } from '@sveltejs/vite-plugin-svelte';
import fs from 'fs';
import colors from 'kleur';
import path from 'path';
import sirv from 'sirv';
import { URL } from 'url';
import { searchForWorkspaceRoot } from 'vite';
import { installPolyfills } from '../../node/polyfills.js';
import * as sync from '../sync/sync.js';
import { getRequest, setResponse } from '../../node/index.js';
import { SVELTE_KIT_ASSETS } from '../constants.js';
import { get_aliases, get_mime_lookup, get_runtime_path, resolve_entry } from '../utils.js';
import { coalesce_to_error } from '../../utils/error.js';
import { load_template, print_config_conflicts } from '../config/index.js';
import { posixify } from '../../utils/filesystem.js';
import { parse_route_id } from '../../utils/routing.js';
import { deep_merge } from '../../utils/object.js';

// Vite doesn't expose this so we just copy the list for now
// https://github.com/vitejs/vite/blob/3edd1af56e980aef56641a5a51cf2932bb580d41/packages/vite/src/node/plugins/css.ts#L96
const style_pattern = /\.(css|less|sass|scss|styl|stylus|pcss|postcss)$/;

const cwd = process.cwd();

/**
 * @param {import('types').ValidatedConfig} svelte_config
 * @return {import('vite').Plugin}
 */
export const sveltekit = function (svelte_config) {
	return {
		name: 'vite-plugin-svelte-kit',

		async config() {
			const [vite_config] = deep_merge(
				{
					server: {
						fs: {
							allow: [
								...new Set([
									svelte_config.kit.files.lib,
									svelte_config.kit.files.routes,
									svelte_config.kit.outDir,
									path.resolve(cwd, 'src'),
									path.resolve(cwd, 'node_modules'),
									path.resolve(searchForWorkspaceRoot(cwd), 'node_modules')
								])
							]
						},
						port: 3000,
						strictPort: true,
						watch: {
							ignored: [
								`${svelte_config.kit.outDir}/**`,
								`!${svelte_config.kit.outDir}/generated/**`
							]
						}
					}
				},
				await svelte_config.kit.vite()
			);

			/** @type {[any, string[]]} */
			const [merged_config, conflicts] = deep_merge(vite_config, {
				configFile: false,
				root: cwd,
				resolve: {
					alias: get_aliases(svelte_config)
				},
				build: {
					rollupOptions: {
						// Vite dependency crawler needs an explicit JS entry point
						// eventhough server otherwise works without it
						input: `${get_runtime_path(svelte_config)}/client/start.js`
					}
				},
				base: '/'
			});

			print_config_conflicts(conflicts, 'kit.vite.');

			return merged_config;
		},

		async configureServer(vite) {
			installPolyfills();

			sync.init(svelte_config);

			const runtime = get_runtime_path(svelte_config);

			process.env.VITE_SVELTEKIT_APP_VERSION_POLL_INTERVAL = '0';

			/** @type {import('types').Respond} */
			const respond = (await import(`${runtime}/server/index.js`)).respond;

			/** @type {import('types').SSRManifest} */
			let manifest;

			function update_manifest() {
				const { manifest_data } = sync.update(svelte_config);

				manifest = {
					appDir: svelte_config.kit.appDir,
					assets: new Set(manifest_data.assets.map((asset) => asset.file)),
					mimeTypes: get_mime_lookup(manifest_data),
					_: {
						entry: {
							file: `/@fs${runtime}/client/start.js`,
							css: [],
							js: []
						},
						nodes: manifest_data.components.map((id, index) => {
							return async () => {
								const url = id.startsWith('..') ? `/@fs${path.posix.resolve(id)}` : `/${id}`;

								const module = /** @type {import('types').SSRComponent} */ (
									await vite.ssrLoadModule(url, { fixStacktrace: false })
								);
								const node = await vite.moduleGraph.getModuleByUrl(url);

								if (!node) throw new Error(`Could not find node for ${url}`);

								const deps = new Set();
								await find_deps(vite, node, deps);

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
											const mod = await vite.ssrLoadModule(dep.url, { fixStacktrace: false });
											styles[dep.url] = mod.default;
										} catch {
											// this can happen with dynamically imported modules, I think
											// because the Vite module graph doesn't distinguish between
											// static and dynamic imports? TODO investigate, submit fix
										}
									}
								}

								return {
									module,
									index,
									entry: url.endsWith('.svelte') ? url : url + '?import',
									css: [],
									js: [],
									// in dev we inline all styles to avoid FOUC
									styles
								};
							};
						}),
						routes: manifest_data.routes.map((route) => {
							const { pattern, names, types } = parse_route_id(route.id);

							if (route.type === 'page') {
								return {
									type: 'page',
									id: route.id,
									pattern,
									names,
									types,
									shadow: route.shadow
										? async () => {
												const url = path.resolve(cwd, /** @type {string} */ (route.shadow));
												return await vite.ssrLoadModule(url, { fixStacktrace: false });
										  }
										: null,
									a: route.a.map((id) => (id ? manifest_data.components.indexOf(id) : undefined)),
									b: route.b.map((id) => (id ? manifest_data.components.indexOf(id) : undefined))
								};
							}

							return {
								type: 'endpoint',
								id: route.id,
								pattern,
								names,
								types,
								load: async () => {
									const url = path.resolve(cwd, route.file);
									return await vite.ssrLoadModule(url, { fixStacktrace: false });
								}
							};
						}),
						matchers: async () => {
							/** @type {Record<string, import('types').ParamMatcher>} */
							const matchers = {};

							for (const key in manifest_data.matchers) {
								const file = manifest_data.matchers[key];
								const url = path.resolve(cwd, file);
								const module = await vite.ssrLoadModule(url, { fixStacktrace: false });

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

			update_manifest();

			for (const event of ['add', 'unlink']) {
				vite.watcher.on(event, (file) => {
					if (file.startsWith(svelte_config.kit.files.routes + path.sep)) {
						update_manifest();
					}
				});
			}

			const assets = svelte_config.kit.paths.assets
				? SVELTE_KIT_ASSETS
				: svelte_config.kit.paths.base;
			const asset_server = sirv(svelte_config.kit.files.assets, {
				dev: true,
				etag: true,
				maxAge: 0,
				extensions: []
			});

			return () => {
				const serve_static_middleware = vite.middlewares.stack.find(
					(middleware) =>
						/** @type {function} */ (middleware.handle).name === 'viteServeStaticMiddleware'
				);

				remove_html_middlewares(vite.middlewares);

				vite.middlewares.use(async (req, res) => {
					try {
						if (!req.url || !req.method) throw new Error('Incomplete request');

						const base = `${vite.config.server.https ? 'https' : 'http'}://${
							req.headers[':authority'] || req.headers.host
						}`;

						const decoded = decodeURI(new URL(base + req.url).pathname);

						if (decoded.startsWith(assets)) {
							const pathname = decoded.slice(assets.length);
							const file = svelte_config.kit.files.assets + pathname;

							if (fs.existsSync(file) && !fs.statSync(file).isDirectory()) {
								const has_correct_case = fs.realpathSync.native(file) === path.resolve(file);

								if (has_correct_case) {
									req.url = encodeURI(pathname); // don't need query/hash
									asset_server(req, res);
									return;
								}
							}
						}

						if (!decoded.startsWith(svelte_config.kit.paths.base)) {
							return not_found(
								res,
								`Not found (did you mean ${svelte_config.kit.paths.base + req.url}?)`
							);
						}

						/** @type {Partial<import('types').Hooks>} */
						const user_hooks = resolve_entry(svelte_config.kit.files.hooks)
							? await vite.ssrLoadModule(`/${svelte_config.kit.files.hooks}`, {
									fixStacktrace: false
							  })
							: {};

						const handle = user_hooks.handle || (({ event, resolve }) => resolve(event));

						/** @type {import('types').Hooks} */
						const hooks = {
							getSession: user_hooks.getSession || (() => ({})),
							handle,
							handleError:
								user_hooks.handleError ||
								(({ /** @type {Error & { frame?: string }} */ error }) => {
									console.error(colors.bold().red(error.message));
									if (error.frame) {
										console.error(colors.gray(error.frame));
									}
									if (error.stack) {
										console.error(colors.gray(error.stack));
									}
								}),
							externalFetch: user_hooks.externalFetch || fetch
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
							`/${posixify(
								path.relative(cwd, `${svelte_config.kit.outDir}/generated/root.svelte`)
							)}`,
							{ fixStacktrace: false }
						);

						const paths = await vite.ssrLoadModule(
							process.env.BUNDLED
								? `/${posixify(path.relative(cwd, `${svelte_config.kit.outDir}/runtime/paths.js`))}`
								: `/@fs${runtime}/paths.js`,
							{ fixStacktrace: false }
						);

						paths.set_paths({
							base: svelte_config.kit.paths.base,
							assets
						});

						let request;

						try {
							request = await getRequest(base, req);
						} catch (/** @type {any} */ err) {
							res.statusCode = err.status || 400;
							return res.end(err.reason || 'Invalid request body');
						}

						const template = load_template(cwd, svelte_config);

						const rendered = await respond(
							request,
							{
								csp: svelte_config.kit.csp,
								dev: true,
								floc: svelte_config.kit.floc,
								get_stack: (error) => {
									return fix_stack_trace(error);
								},
								handle_error: (error, event) => {
									hooks.handleError({
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
								},
								hooks,
								hydrate: svelte_config.kit.browser.hydrate,
								manifest,
								method_override: svelte_config.kit.methodOverride,
								paths: {
									base: svelte_config.kit.paths.base,
									assets
								},
								prefix: '',
								prerender: {
									default: svelte_config.kit.prerender.default,
									enabled: svelte_config.kit.prerender.enabled
								},
								read: (file) => fs.readFileSync(path.join(svelte_config.kit.files.assets, file)),
								root,
								router: svelte_config.kit.browser.router,
								template: ({ head, body, assets, nonce }) => {
									return (
										template
											.replace(/%sveltekit\.assets%/g, assets)
											.replace(/%sveltekit\.nonce%/g, nonce)
											// head and body must be replaced last, in case someone tries to sneak in %sveltekit.assets% etc
											.replace('%sveltekit.head%', () => head)
											.replace('%sveltekit.body%', () => body)
									);
								},
								template_contains_nonce: template.includes('%sveltekit.nonce%'),
								trailing_slash: svelte_config.kit.trailingSlash
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
						vite.ssrFixStacktrace(error);
						res.statusCode = 500;
						res.end(error.stack);
					}
				});
			};
		}
	};
};

/** @param {import('http').ServerResponse} res */
function not_found(res, message = 'Not found') {
	res.statusCode = 404;
	res.end(message);
}

/**
 * @param {import('connect').Server} server
 */
function remove_html_middlewares(server) {
	const html_middlewares = [
		'viteIndexHtmlMiddleware',
		'vite404Middleware',
		'viteSpaFallbackMiddleware',
		'viteServeStaticMiddleware'
	];
	for (let i = server.stack.length - 1; i > 0; i--) {
		// @ts-expect-error using internals until https://github.com/vitejs/vite/pull/4640 is merged
		if (html_middlewares.includes(server.stack[i].handle.name)) {
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
	} else {
		node.importedModules.forEach((node) => branches.push(add(node)));
	}

	await Promise.all(branches);
}

/**
 * @param {import('types').ValidatedConfig} svelte_config
 * @return {import('vite').Plugin[]}
 */
export const svelte = function (svelte_config) {
	return svelte_plugin({
		...svelte_config,
		compilerOptions: {
			...svelte_config.compilerOptions,
			hydratable: !!svelte_config.kit.browser.hydrate
		},
		configFile: false
	});
};

/**
 * @param {import('types').ValidatedConfig} svelte_config
 * @return {import('vite').Plugin[]}
 */
export const plugins = function (svelte_config) {
	return [...svelte(svelte_config), sveltekit(svelte_config)];
};
