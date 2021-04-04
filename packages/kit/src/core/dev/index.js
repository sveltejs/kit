import fs from 'fs';
import path from 'path';
import { parse, URLSearchParams } from 'url';
import { EventEmitter } from 'events';
import CheapWatch from 'cheap-watch';
import amp_validator from 'amphtml-validator';
import vite from 'vite';
import create_manifest_data from '../../core/create_manifest_data/index.js';
import { create_app } from '../../core/create_app/index.js';
import { rimraf } from '../filesystem/index.js';
import { ssr } from '../../runtime/server/index.js';
import { get_body } from '../http/index.js';
import { copy_assets } from '../utils.js';
import svelte from '@sveltejs/vite-plugin-svelte';
import { get_server } from '../server/index.js';

/** @typedef {{ cwd?: string, port: number, host: string, https: boolean, config: import('../../../types.internal').ValidatedConfig }} Options */
/** @typedef {import('../../../types.internal').SSRComponent} SSRComponent */

/** @param {Options} opts */
export function dev(opts) {
	return new Watcher(opts).init();
}

class Watcher extends EventEmitter {
	/** @param {Options} opts */
	constructor({ cwd = process.cwd(), port, host, https, config }) {
		super();

		this.cwd = cwd;
		this.dir = path.resolve(cwd, '.svelte/dev');

		this.port = port;
		this.host = host;
		this.https = https;
		this.config = config;

		process.env.NODE_ENV = 'development';

		process.on('exit', () => {
			this.close();
		});
	}

	async init() {
		rimraf(this.dir);
		copy_assets(this.dir);
		process.env.VITE_SVELTEKIT_AMP = this.config.kit.amp ? 'true' : '';

		await this.init_filewatcher();
		await this.init_server();

		this.update();

		return this;
	}

	async init_filewatcher() {
		this.cheapwatch = new CheapWatch({
			dir: this.config.kit.files.routes,
			/** @type {({ path }: { path: string }) => boolean} */
			filter: ({ path }) => path.split('/').every((part) => !part.startsWith('_'))
		});

		await this.cheapwatch.init();

		// not sure why TS doesn't understand that CheapWatch extends EventEmitter
		this.cheapwatch.on('+', ({ isNew }) => {
			if (isNew) this.update();
		});

		this.cheapwatch.on('-', () => {
			this.update();
		});
	}

	async init_server() {
		/** @type {any} */
		const user_config = (this.config.kit.vite && this.config.kit.vite()) || {};

		/**
		 * @type {vite.ViteDevServer}
		 */
		this.vite = await vite.createServer({
			...user_config,
			configFile: false,
			root: this.cwd,
			resolve: {
				...user_config.resolve,
				alias: {
					...(user_config.resolve && user_config.resolve.alias),
					$app: path.resolve(`${this.dir}/runtime/app`),
					$lib: this.config.kit.files.lib
				}
			},
			plugins: [
				...(user_config.plugins || []),
				svelte({
					// TODO remove this once vite-plugin-svelte caching bugs are fixed
					disableTransformCache: true,
					extensions: this.config.extensions
				})
			],
			publicDir: this.config.kit.files.assets,
			server: {
				...user_config.server,
				middlewareMode: true
			},
			optimizeDeps: {
				...user_config.optimizeDeps,
				entries: []
			}
		});

		const validator = this.config.kit.amp && (await amp_validator.getInstance());

		/**
		 * @param {import('vite').ModuleNode} node
		 * @param {Set<import('vite').ModuleNode>} deps
		 */
		const find_deps = (node, deps) => {
			for (const dep of node.importedModules) {
				if (!deps.has(dep)) {
					deps.add(dep);
					find_deps(dep, deps);
				}
			}
		};

		this.server = await get_server(this.port, this.host, this.https, (req, res) => {
			this.vite.middlewares(req, res, async () => {
				try {
					const parsed = parse(req.url);

					if (req.url === '/favicon.ico') return;

					// handle dynamic requests - i.e. pages and endpoints
					const template = fs.readFileSync(this.config.kit.files.template, 'utf-8');

					const hooks = /** @type {import('../../../types.internal').Hooks} */ (await this.vite
						.ssrLoadModule(`/${this.config.kit.files.hooks}`)
						.catch(() => ({})));

					let root;

					try {
						root = (await this.vite.ssrLoadModule(`/${this.dir}/generated/root.svelte`)).default;
					} catch (e) {
						res.statusCode = 500;
						res.end(e.stack);
						return;
					}

					const body = await get_body(req);

					const host = /** @type {string} */ (this.config.kit.host ||
						req.headers[this.config.kit.hostHeader || 'host']);

					const rendered = await ssr(
						{
							headers: /** @type {import('../../../types.internal').Headers} */ (req.headers),
							method: req.method,
							host,
							path: parsed.pathname,
							query: new URLSearchParams(parsed.query),
							body
						},
						{
							paths: this.config.kit.paths,
							template: ({ head, body }) => {
								let rendered = template
									.replace('%svelte.head%', () => head)
									.replace('%svelte.body%', () => body);

								if (this.config.kit.amp) {
									const result = validator.validateString(rendered);

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
							manifest: this.manifest,
							load_component: async (id) => {
								// if (id === 'layout') id = this.manifest.layout;
								// if (id === 'error') id = this.manifest.error;

								const url = path.resolve(this.cwd, id);

								const module = /** @type {SSRComponent} */ (await this.vite.ssrLoadModule(url));
								const node = await this.vite.moduleGraph.getModuleByUrl(url);

								const deps = new Set();
								find_deps(node, deps);

								const css = new Set();
								const styles = new Set();

								for (const dep of deps) {
									// TODO what about .scss files, etc?
									if (dep.file.endsWith('.css')) {
										try {
											const mod = await this.vite.ssrLoadModule(dep.url);
											css.add(dep.url);
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
									entry: `/${id}?import`,
									css: Array.from(css),
									js: [],
									styles: Array.from(styles)
								};
							},
							target: this.config.kit.target,
							entry: '/.svelte/dev/runtime/internal/start.js',
							dev: true,
							amp: this.config.kit.amp,
							root,
							hooks: {
								getContext: hooks.getContext || (() => ({})),
								getSession: hooks.getSession || (() => ({})),
								handle: hooks.handle || ((request, render) => render(request))
							},
							only_render_prerenderable_pages: false,
							// get_component_path: (id) => `/${id}?import`,
							get_stack: (error) => {
								this.vite.ssrFixStacktrace(error);
								return error.stack;
							},
							get_static_file: (file) =>
								fs.readFileSync(path.join(this.config.kit.files.assets, file)),
							// get_amp_css: (url) => '', // TODO: implement this
							ssr: this.config.kit.ssr,
							router: this.config.kit.router,
							hydrate: this.config.kit.hydrate
						}
					);

					if (rendered) {
						res.writeHead(rendered.status, rendered.headers);
						res.end(rendered.body);
					} else {
						res.statusCode = 404;
						res.end('Not found');
					}
				} catch (e) {
					this.vite.ssrFixStacktrace(e);
					res.end(e.stack);
				}
			});
		});
	}

	update() {
		const manifest_data = create_manifest_data({
			config: this.config,
			output: this.dir,
			cwd: this.cwd
		});

		create_app({
			manifest_data,
			output: this.dir,
			cwd: this.cwd
		});

		/** @type {import('../../../types.internal').SSRManifest} */
		this.manifest = {
			assets: manifest_data.assets,
			layout: manifest_data.layout,
			error: manifest_data.error,
			routes: manifest_data.routes.map((route) => {
				if (route.type === 'page') {
					return {
						type: 'page',
						pattern: route.pattern,
						params: get_params(route.params),
						parts: route.parts
					};
				}

				return {
					type: 'endpoint',
					pattern: route.pattern,
					params: get_params(route.params),
					load: async () => {
						const url = path.resolve(this.cwd, route.file);
						return await this.vite.ssrLoadModule(url);
					}
				};
			})
		};
	}

	close() {
		if (this.closed) return;
		this.closed = true;

		this.vite.close();
		this.server.close();
		this.cheapwatch.close();
	}
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
				params[key.slice(3)] = decodeURIComponent(match[i + 1]);
			} else {
				params[key] = decodeURIComponent(match[i + 1]);
			}
		});
		return params;
	};

	return fn;
}
