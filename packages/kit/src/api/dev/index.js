import http from 'http';
import { readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { parse, URLSearchParams } from 'url';
import { EventEmitter } from 'events';
import CheapWatch from 'cheap-watch';
import amp_validator from 'amphtml-validator';
import vite from 'vite';
import create_manifest_data from '../../core/create_manifest_data';
import { create_app } from '../../core/create_app';
import { rimraf } from '@sveltejs/app-utils/files';
import { render } from '../../renderer';
import { get_body } from '@sveltejs/app-utils/http';
import { copy_assets } from '../utils';
import svelte from '@svitejs/vite-plugin-svelte';

/** @typedef {{ port: number, config: import('../../types').ValidatedConfig }} Options */

/** @param {Options} opts */
export function dev(opts) {
	return new Watcher(opts).init();
}

const dev_dir = '.svelte/dev';

class Watcher extends EventEmitter {
	/** @param {Options} opts */
	constructor({ port, config }) {
		super();

		this.port = port;
		this.config = config;

		process.env.NODE_ENV = 'development';

		process.on('exit', () => {
			this.close();
		});
	}

	async init() {
		rimraf(dev_dir);

		copy_assets(dev_dir);

		// TODO move this (and copy_assets?) into create_app
		// prettier-ignore
		writeFileSync(`${dev_dir}/runtime/app/env.js`, [
			'export const browser = !import.meta.env.SSR;',
			'export const dev = true;',
			`export const amp = ${this.config.kit.amp};`
		].join('\n'));

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
		/**
		 * @type {vite.ViteDevServer}
		 */
		this.viteDevServer = await vite.createServer({
			resolve: {
				alias: {
					$app: resolve(`${dev_dir}/runtime/app`)
				}
			},
			plugins: [
				svelte({
					emitCss: true,
					compilerOptions: {
						dev: true,
						hydratable: true
					},
					hot: true,
					extensions: this.config.extensions
				})
			],
			publicDir: this.config.kit.files.assets,
			server: {
				middlewareMode: true
			}
		});

		const { set_paths } = await this.viteDevServer.ssrLoadModule(
			`/${dev_dir}/runtime/internal/singletons.js`
		);

		set_paths(this.config.kit.paths);

		const validator = this.config.kit.amp && (await amp_validator.getInstance());

		this.server = http.createServer((req, res) => {
			this.viteDevServer.middlewares(req, res, async () => {
				try {
					const parsed = parse(req.url);

					if (req.url === '/favicon.ico') return;

					// handle dynamic requests - i.e. pages and endpoints
					const template = readFileSync(this.config.kit.files.template, 'utf-8');

					const setup = await this.viteDevServer
						.ssrLoadModule(`/${this.config.kit.files.setup}`)
						.catch(() => ({}));

					let root;

					try {
						root = (await this.viteDevServer.ssrLoadModule(`/${dev_dir}/generated/root.svelte`))
							.default;
					} catch (e) {
						res.statusCode = 500;
						res.end(e.stack);
						return;
					}

					const body = await get_body(req);

					const rendered = await render(
						{
							headers: req.headers,
							method: req.method,
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
							target: this.config.kit.target,
							entry: `/${dev_dir}/runtime/internal/start.js`,
							dev: true,
							amp: this.config.kit.amp,
							root,
							setup,
							only_prerender: false,
							start_global: this.config.kit.startGlobal,
							host: this.config.kit.host,
							host_header: this.config.kit.hostHeader,
							get_stack: (error) => {
								this.viteDevServer.ssrFixStacktrace(error);
								return error.stack;
							},
							get_static_file: (file) => readFileSync(join(this.config.kit.files.assets, file)),
							get_amp_css: (url) => '' // TODO: implement this
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
					this.viteDevServer.ssrFixStacktrace(e);
					res.end(e.stack);
				}
			});
		});

		this.server.listen(this.port);
	}

	update() {
		const manifest_data = create_manifest_data({
			config: this.config,
			output: dev_dir
		});

		create_app({
			manifest_data,
			output: dev_dir
		});

		const common_css_deps = new Set();

		/**
		 * @param {string} url
		 */
		const load = async (url) => {
			const mod = await this.viteDevServer.ssrLoadModule(url);
			const node = await this.viteDevServer.moduleGraph.getModuleByUrl(url);

			const deps = new Set();
			find_deps(node, deps);

			const css = new Set();
			for (const dep of deps) {
				// TODO what about .scss files, etc?
				if (dep.file.endsWith('.css')) {
					const mod = await this.viteDevServer.ssrLoadModule(dep.url);
					css.add(mod.default);
				}
			}

			return { mod, css };
		};

		/**
		 *
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

		this.manifest = {
			assets: manifest_data.assets,
			layout: async () => {
				const { mod, css } = await load(manifest_data.layout);
				css.forEach((mod) => {
					common_css_deps.add(mod);
				});
				return mod;
			},
			error: async () => {
				const { mod, css } = await load(manifest_data.error);
				css.forEach((mod) => {
					common_css_deps.add(mod);
				});
				return mod;
			},
			pages: manifest_data.pages.map((data) => {
				// This is a bit of a hack, but it means we can inject the correct <style>
				// contents without needing to do any analysis before loading
				const css_deps = new Set();

				return {
					pattern: data.pattern,
					params: get_params(data.params),
					parts: data.parts.map((file) => async () => {
						const { mod, css } = await load(file);

						css.forEach((mod) => {
							css_deps.add(mod);
						});

						return mod;
					}),
					get style() {
						return [...common_css_deps, ...css_deps].join('\n');
					},
					css: [],
					js: []
				};
			}),
			endpoints: manifest_data.endpoints.map((data) => ({
				pattern: data.pattern,
				params: get_params(data.params),
				load: async () => await this.viteDevServer.ssrLoadModule(data.file)
			}))
		};
	}

	close() {
		if (this.closed) return;
		this.closed = true;

		this.viteDevServer.close();
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
		/** @type {Record<string, string | string[]>} */
		const params = {};
		array.forEach((key, i) => {
			if (key.startsWith('...')) {
				params[key.slice(3)] = decodeURIComponent(match[i + 1]).split('/');
			} else {
				params[key] = decodeURIComponent(match[i + 1]);
			}
		});
		return params;
	};

	return fn;
}
