import fs from 'fs';
import path from 'path';
import { URL } from 'url';
import colors from 'kleur';
import { respond } from '../../runtime/server/index.js';
import { __fetch_polyfill } from '../../install-fetch.js';
import { create_app } from '../create_app/index.js';
import create_manifest_data from '../create_manifest_data/index.js';
import { getRawBody } from '../node/index.js';
import { SVELTE_KIT, SVELTE_KIT_ASSETS } from '../constants.js';
import { get_mime_lookup, resolve_entry } from '../utils.js';
import { coalesce_to_error } from '../../utils/error.js';
import { load_template } from '../config/index.js';

/**
 * @param {import('types/config').ValidatedConfig} config
 * @param {string} output
 * @param {string} cwd
 * @param {import('amphtml-validator').Validator | false} amp
 * @returns {import('vite').Plugin}
 */
export function create_plugin(config, output, cwd, amp) {
	return {
		name: 'vite-plugin-svelte-kit',

		configureServer(vite) {
			__fetch_polyfill();

			/** @type {import('types/app').SSRManifest} */
			let manifest;

			function update_manifest() {
				const manifest_data = create_manifest_data({ config, output, cwd });

				create_app({ manifest_data, output, cwd });

				manifest = {
					appDir: config.kit.appDir,
					assets: new Set(manifest_data.assets.map((asset) => asset.file)),
					_: {
						mime: get_mime_lookup(manifest_data),
						entry: {
							file: `/${SVELTE_KIT}/dev/runtime/internal/start.js`,
							css: [],
							js: []
						},
						nodes: manifest_data.components.map((id) => {
							return async () => {
								const url = `/${id}`;

								const module = /** @type {import('types/internal').SSRComponent} */ (
									await vite.ssrLoadModule(url)
								);
								const node = await vite.moduleGraph.getModuleByUrl(url);

								if (!node) throw new Error(`Could not find node for ${url}`);

								const deps = new Set();
								find_deps(node, deps);

								const styles = new Set();

								for (const dep of deps) {
									const parsed = new URL(dep.url, 'http://localhost/');
									const query = parsed.searchParams;

									// TODO what about .scss files, etc?
									if (
										dep.file.endsWith('.css') ||
										(query.has('svelte') && query.get('type') === 'style')
									) {
										try {
											const mod = await vite.ssrLoadModule(dep.url);
											styles.add(mod.default);
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
									styles: Array.from(styles)
								};
							};
						}),
						routes: manifest_data.routes.map((route) => {
							if (route.type === 'page') {
								return {
									type: 'page',
									pattern: route.pattern,
									params: get_params(route.params),
									a: route.a.map((id) => manifest_data.components.indexOf(id)),
									b: route.b.map((id) => manifest_data.components.indexOf(id))
								};
							}

							return {
								type: 'endpoint',
								pattern: route.pattern,
								params: get_params(route.params),
								load: async () => {
									const url = path.resolve(cwd, route.file);
									return await vite.ssrLoadModule(url);
								}
							};
						})
					}
				};
			}

			update_manifest();

			vite.watcher.on('add', update_manifest);
			vite.watcher.on('remove', update_manifest);

			return () => {
				remove_html_middlewares(vite.middlewares);

				vite.middlewares.use(async (req, res) => {
					try {
						if (!req.url || !req.method) throw new Error('Incomplete request');
						if (req.url === '/favicon.ico') return not_found(res);

						const parsed = new URL(req.url, 'http://localhost/');
						if (!parsed.pathname.startsWith(config.kit.paths.base)) return not_found(res);

						/** @type {Partial<import('types/internal').Hooks>} */
						const user_hooks = resolve_entry(config.kit.files.hooks)
							? await vite.ssrLoadModule(`/${config.kit.files.hooks}`)
							: {};

						/** @type {import('types/internal').Hooks} */
						const hooks = {
							getSession: user_hooks.getSession || (() => ({})),
							handle: user_hooks.handle || (({ request, resolve }) => resolve(request)),
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
								'The getContext hook has been removed. See https://kit.svelte.dev/docs#hooks'
							);
						}

						if (/** @type {any} */ (hooks).serverFetch) {
							// TODO remove this for 1.0
							throw new Error('The serverFetch hook has been renamed to externalFetch.');
						}

						const root = (await vite.ssrLoadModule(`/${output}/generated/root.svelte`)).default;

						const paths = await vite.ssrLoadModule(`/${SVELTE_KIT}/dev/runtime/paths.js`);

						paths.set_paths({
							base: config.kit.paths.base,
							assets: config.kit.paths.assets ? SVELTE_KIT_ASSETS : config.kit.paths.base
						});

						let body;

						try {
							body = await getRawBody(req);
						} catch (/** @type {any} */ err) {
							res.statusCode = err.status || 400;
							return res.end(err.reason || 'Invalid request body');
						}

						const rendered = await respond(
							{
								url: new URL(
									`${vite.config.server.https ? 'https' : 'http'}://${req.headers.host}${req.url}`
								),
								headers: /** @type {import('types/helper').RequestHeaders} */ (req.headers),
								method: req.method,
								rawBody: body
							},
							{
								amp: config.kit.amp,
								dev: true,
								floc: config.kit.floc,
								get_stack: (error) => {
									vite.ssrFixStacktrace(error);
									return error.stack;
								},
								handle_error: (error, request) => {
									vite.ssrFixStacktrace(error);
									hooks.handleError({ error, request });
								},
								hooks,
								hydrate: config.kit.hydrate,
								manifest,
								paths: {
									base: config.kit.paths.base,
									assets: config.kit.paths.assets ? SVELTE_KIT_ASSETS : config.kit.paths.base
								},
								prefix: '',
								prerender: config.kit.prerender.enabled,
								read: (file) => fs.readFileSync(path.join(config.kit.files.assets, file)),
								root,
								router: config.kit.router,
								ssr: config.kit.ssr,
								target: config.kit.target,
								template: ({ head, body, assets }) => {
									let rendered = load_template(cwd, config)
										.replace('%svelte.head%', () => head)
										.replace('%svelte.body%', () => body)
										.replace(/%svelte\.assets%/g, assets);

									if (amp) {
										const result = amp.validateString(rendered);

										if (result.status !== 'PASS') {
											const lines = rendered.split('\n');

											/** @param {string} str */
											const escape = (str) =>
												str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

											rendered = `<!doctype html>
										<head>
											<meta charset="utf-8" />
											<meta name="viewport" content="width=device-width, initial-scale=1" />
											<style>
												body {
													font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
													color: #333;
												}

												pre {
													background: #f4f4f4;
													padding: 1em;
													overflow-x: auto;
												}
											</style>
										</head>
										<h1>AMP validation failed</h1>

										${result.errors
											.map(
												(error) => `
											<h2>${error.severity}</h2>
											<p>Line ${error.line}, column ${error.col}: ${error.message} (<a href="${error.specUrl}">${
													error.code
												}</a>)</p>
											<pre>${escape(lines[error.line - 1])}</pre>
										`
											)
											.join('\n\n')}
									`;
										}
									}

									return rendered;
								},
								trailing_slash: config.kit.trailingSlash
							}
						);

						if (rendered) {
							res.writeHead(rendered.status, rendered.headers);
							if (rendered.body) res.write(rendered.body);
							res.end();
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

/** @param {string[]} array */
function get_params(array) {
	// given an array of params like `['x', 'y', 'z']` for
	// src/routes/[x]/[y]/[z]/svelte, create a function
	// that turns a RegExpExecArray into ({ x, y, z })

	/** @param {RegExpExecArray} match */
	const fn = (match) => {
		/** @type {Record<string, string>} */
		const params = {};
		array.forEach((key, i) => {
			if (key.startsWith('...')) {
				params[key.slice(3)] = match[i + 1] || '';
			} else {
				params[key] = match[i + 1];
			}
		});
		return params;
	};

	return fn;
}

/** @param {import('http').ServerResponse} res */
function not_found(res) {
	res.statusCode = 404;
	res.end('Not found');
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
