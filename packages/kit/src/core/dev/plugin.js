import fs from 'fs';
import path from 'path';
import { URL } from 'url';
import colors from 'kleur';
import sirv from 'sirv';
import { installFetch } from '../../install-fetch.js';
import * as sync from '../sync/sync.js';
import { getRequest, setResponse } from '../../node.js';
import { SVELTE_KIT_ASSETS } from '../constants.js';
import { get_mime_lookup, get_runtime_path, resolve_entry } from '../utils.js';
import { coalesce_to_error } from '../../utils/error.js';
import { load_template } from '../config/index.js';
import { sequence } from '../../hooks.js';
import { posixify } from '../../utils/filesystem.js';
import { parse_route_id } from '../../utils/routing.js';
import { normalize_path } from '../../utils/url.js';

/**
 * @param {import('types').ValidatedConfig} config
 * @param {string} cwd
 * @returns {Promise<import('vite').Plugin>}
 */
export async function create_plugin(config, cwd) {
	const runtime = get_runtime_path(config);

	/** @type {import('types').Handle} */
	let amp;

	if (config.kit.amp) {
		process.env.VITE_SVELTEKIT_AMP = 'true';
		amp = (await import('./amp_hook.js')).handle;
	}

	process.env.VITE_SVELTEKIT_APP_VERSION_POLL_INTERVAL = '0';

	/** @type {import('types').Respond} */
	const respond = (await import(`${runtime}/server/index.js`)).respond;

	return {
		name: 'vite-plugin-svelte-kit',

		configureServer(vite) {
			installFetch();

			/** @type {import('types').SSRManifest} */
			let manifest;

			function update_manifest() {
				const { manifest_data } = sync.update(config);

				manifest = {
					appDir: config.kit.appDir,
					assets: new Set(manifest_data.assets.map((asset) => asset.file)),
					mimeTypes: get_mime_lookup(manifest_data),
					_: {
						entry: {
							file: `/@fs${runtime}/client/start.js`,
							css: [],
							js: []
						},
						nodes: manifest_data.components.map((id) => {
							return async () => {
								const url = id.startsWith('..') ? `/@fs${path.posix.resolve(id)}` : `/${id}`;

								const module = /** @type {import('types').SSRComponent} */ (
									await vite.ssrLoadModule(url, { fixStacktrace: false })
								);
								const node = await vite.moduleGraph.getModuleByUrl(url);

								if (!node) throw new Error(`Could not find node for ${url}`);

								const deps = new Set();
								find_deps(node, deps);

								/** @type {Record<string, string>} */
								const styles = {};

								for (const dep of deps) {
									const parsed = new URL(dep.url, 'http://localhost/');
									const query = parsed.searchParams;

									// TODO what about .scss files, etc?
									if (
										dep.file.endsWith('.css') ||
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

			vite.watcher.on('add', update_manifest);
			vite.watcher.on('unlink', update_manifest);

			const assets = config.kit.paths.assets ? SVELTE_KIT_ASSETS : config.kit.paths.base;
			const asset_server = sirv(config.kit.files.assets, {
				dev: true,
				etag: true,
				maxAge: 0,
				extensions: []
			});

			return () => {
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
							const file = config.kit.files.assets + pathname;

							if (fs.existsSync(file) && !fs.statSync(file).isDirectory()) {
								req.url = encodeURI(pathname); // don't need query/hash
								asset_server(req, res);
								return;
							}
						}

						if (req.url === '/favicon.ico') return not_found(res);

						if (!decoded.startsWith(config.kit.paths.base)) {
							const suggestion = normalize_path(
								config.kit.paths.base + req.url,
								config.kit.trailingSlash
							);
							return not_found(res, `Not found (did you mean ${suggestion}?)`);
						}

						/** @type {Partial<import('types').Hooks>} */
						const user_hooks = resolve_entry(config.kit.files.hooks)
							? await vite.ssrLoadModule(`/${config.kit.files.hooks}`, { fixStacktrace: false })
							: {};

						const handle = user_hooks.handle || (({ event, resolve }) => resolve(event));

						/** @type {import('types').Hooks} */
						const hooks = {
							getSession: user_hooks.getSession || (() => ({})),
							handle: amp ? sequence(amp, handle) : handle,
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
							`/${posixify(path.relative(cwd, `${config.kit.outDir}/generated/root.svelte`))}`,
							{ fixStacktrace: false }
						);

						const paths = await vite.ssrLoadModule(
							process.env.BUNDLED
								? `/${posixify(path.relative(cwd, `${config.kit.outDir}/runtime/paths.js`))}`
								: `/@fs${runtime}/paths.js`,
							{ fixStacktrace: false }
						);

						paths.set_paths({
							base: config.kit.paths.base,
							assets
						});

						let request;

						try {
							request = await getRequest(base, req);
						} catch (/** @type {any} */ err) {
							res.statusCode = err.status || 400;
							return res.end(err.reason || 'Invalid request body');
						}

						const template = load_template(cwd, config);

						const rendered = await respond(
							request,
							{
								amp: config.kit.amp,
								csp: config.kit.csp,
								dev: true,
								floc: config.kit.floc,
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
								hydrate: config.kit.browser.hydrate,
								manifest,
								method_override: config.kit.methodOverride,
								paths: {
									base: config.kit.paths.base,
									assets
								},
								prefix: '',
								prerender: config.kit.prerender.enabled,
								read: (file) => fs.readFileSync(path.join(config.kit.files.assets, file)),
								root,
								router: config.kit.browser.router,
								template: ({ head, body, assets, nonce }) => {
									return (
										template
											.replace(/%svelte\.assets%/g, assets)
											.replace(/%svelte\.nonce%/g, nonce)
											// head and body must be replaced last, in case someone tries to sneak in %svelte.assets% etc
											.replace('%svelte.head%', () => head)
											.replace('%svelte.body%', () => body)
									);
								},
								template_contains_nonce: template.includes('%svelte.nonce%'),
								trailing_slash: config.kit.trailingSlash
							},
							{
								getClientAddress: () => {
									const { remoteAddress } = req.socket;
									if (remoteAddress) return remoteAddress;
									throw new Error('Could not determine clientAddress');
								}
							}
						);

						if (rendered) {
							setResponse(res, rendered);
						} else {
							not_found(res);
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
}

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
		'viteSpaFallbackMiddleware'
	];
	for (let i = server.stack.length - 1; i > 0; i--) {
		// @ts-expect-error using internals until https://github.com/vitejs/vite/pull/4640 is merged
		if (html_middlewares.includes(server.stack[i].handle.name)) {
			server.stack.splice(i, 1);
		}
	}
}

/**
 * @param {import('vite').ModuleNode} node
 * @param {Set<import('vite').ModuleNode>} deps
 */
function find_deps(node, deps) {
	for (const dep of node.importedModules) {
		if (!deps.has(dep)) {
			deps.add(dep);
			find_deps(dep, deps);
		}
	}
}
