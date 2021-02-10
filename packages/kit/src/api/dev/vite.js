import express from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse, URLSearchParams } from 'url';
import { EventEmitter } from 'events';
import CheapWatch from 'cheap-watch';
import { scorta } from 'scorta/sync';
import sirv from 'sirv';
import amp_validator from 'amphtml-validator';
import vite from 'vite';
import create_manifest_data from '../../core/create_manifest_data';
import { create_app } from '../../core/create_app';
import { mkdirp } from '@sveltejs/app-utils/files';
import { render } from '../../renderer';
import { get_body } from '@sveltejs/app-utils/http';
import { copy_assets } from '../utils';

export function dev(opts) {
	return new Watcher(opts).init();
}

class Watcher extends EventEmitter {
	constructor({ port, config }) {
		super();

		this.cachedir = scorta('svelte');
		this.port = port;
		this.config = config;
		this.update();

		process.env.NODE_ENV = 'development';

		process.on('exit', () => {
			this.close();
		});
	}

	async init() {
		mkdirp('.svelte');

		copy_assets();

		await this.init_filewatcher();
		await this.init_server();

		return this;
	}

	async init_filewatcher() {
		this.cheapwatch = new CheapWatch({
			dir: this.config.files.routes,
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
			server: {
			  middlewareMode: true
			}
		});

		const app_dir = this.config.appDir;
		const {
			set_paths
		} = await this.viteDevServer.ssrLoadModule(`/${app_dir}/assets/runtime/internal/singletons.js`);

		set_paths(this.config.paths);

		const static_handler = sirv(this.config.files.assets, {
			dev: true
		});

		const validator = this.config.amp && (await amp_validator.getInstance());

		this.server = express();

		this.server.use(sirv('static', { dev }));

		// use viteDevServer's connect instance as middleware
		this.server.use(this.viteDevServer.middlewares);

		this.server.use('*', async (req, res, next) => {
			try {
				const parsed = parse(req.originalUrl);

				static_handler(req, res, async () => {
					if (req.originalUrl === '/favicon.ico') return;

					// handle dynamic requests - i.e. pages and endpoints
					const template = readFileSync(this.config.files.template, 'utf-8');

					let setup;

					try {
						setup = (await this.viteDevServer.ssrLoadModule(`/${app_dir}/setup/index.js`));
					} catch (err) {
						setup = {};
					}

					let root;

					try {
//						root = (await this.viteDevServer.ssrLoadModule(`/${app_dir}/assets/generated/root.svelte.js`)).default;
						root = (await this.viteDevServer.ssrLoadModule(`/${app_dir}/assets/generated/root.svelte`)).default;
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
							paths: this.config.paths,
							template: ({ head, body }) => {
								let rendered = template
									.replace('%svelte.head%', () => head)
									.replace('%svelte.body%', () => body);

								if (this.config.amp) {
									const result = validator.validateString(rendered);

									if (result.status !== 'PASS') {
										const lines = rendered.split('\n');

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
							target: this.config.target,
							entry: 'assets/runtime/internal/start.js',
							dev: true,
							amp: this.config.amp,
							root,
							setup,
							only_prerender: false,
							start_global: this.config.startGlobal,
							app_dir,
							host: this.config.host,
							host_header: this.config.hostHeader,
							get_stack: (error) => error.stack, // TODO: use viteDevServer.ssrFixStacktrace?
							get_static_file: (file) => readFileSync(join(this.config.files.assets, file)),
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
				});
			} catch (e) {
				this.viteDevServer.ssrFixStacktrace(e);
				console.log(e.stack);
				next(e);
			}
		});

		this.server.listen(this.port);
	}

	update() {
		const manifest_data = create_manifest_data(this.config);

		create_app({
			manifest_data,
			output: '.svelte/assets'
		});

		const common_css_deps = new Set();

		this.manifest = {
			assets: manifest_data.assets,
			layout: async () => {
				// TODO: CSS support
				// const { exports, css } = await this.load(manifest_data.layout.url);
				// css.forEach((dep) => common_css_deps.add(dep));
				// return exports;

				return await this.viteDevServer.ssrLoadModule(manifest_data.layout.url);
			},
			error: async () => {
				// TODO: CSS support
				// const { exports, css } = await this.load(manifest_data.error.url);
				// css.forEach((dep) => common_css_deps.add(dep));
				// return exports;

				return await this.viteDevServer.ssrLoadModule(manifest_data.error.url);
			},
			pages: manifest_data.pages.map((data) => {
				// This is a bit of a hack, but it means we can inject the correct <link>
				// elements without needing to do any analysis before loading
				const css_deps = new Set();

				return {
					pattern: data.pattern,
					params: get_params(data.params),
					parts: data.parts.map(({ url }) => async () => {
						// TODO: CSS support
						// const { exports, css } = await this.load(url);
						// common_css_deps.forEach((url) => css_deps.add(url));
						// css.forEach((url) => css_deps.add(url));
						// return exports;

						return await this.viteDevServer.ssrLoadModule(url);
					}),
					get css() {
						return Array.from(css_deps);
					},
					js: []
				};
			}),
			endpoints: manifest_data.endpoints.map((data) => ({
				pattern: data.pattern,
				params: get_params(data.params),
				load: async () => await this.viteDevServer.ssrLoadModule(data.url)
			}))
		};
	}

	close() {
		if (this.closed) return;
		this.closed = true;

		this.server.close();
		this.cheapwatch.close();
	}
}

// given an array of params like `['x', 'y', 'z']` for
// src/routes/[x]/[y]/[z]/svelte, create a function
// that turns a RexExpMatchArray into ({ x, y, z })
function get_params(array) {
	return (match) => {
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
}
