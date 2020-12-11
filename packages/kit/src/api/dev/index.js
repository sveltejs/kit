import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { parse, URLSearchParams } from 'url';
import { EventEmitter } from 'events';
import CheapWatch from 'cheap-watch';
import { scorta } from 'scorta/sync';
import * as ports from 'port-authority';
import sirv from 'sirv';
import create_manifest_data from '../../core/create_manifest_data';
import { createServer } from 'http';
import { create_app } from '../../core/create_app';
import snowpack from 'snowpack';
import pkg from '../../../package.json';
import loader from './loader';
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

		// TODO use import.meta.env.SSR upon resolution of https://github.com/snowpackjs/snowpack/discussions/1889
		// prettier-ignore
		writeFileSync('.svelte/assets/runtime/app/env.js', [
			'export const browser = typeof window !== "undefined";',
			'export const dev = true;'
		].join('\n'));

		await this.init_filewatcher();
		await this.init_snowpack();
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

	async init_snowpack() {
		process.env.SVELTE_KIT_APP_DIR = this.config.appDir;

		this.snowpack_port = await ports.find(this.port + 1);
		this.snowpack_config = snowpack.loadAndValidateConfig(
			{
				config: 'snowpack.config.js',
				port: this.snowpack_port
			},
			pkg
		);

		this.snowpack_config.mount[resolve('.svelte/assets')] = {
			url: `/${this.config.appDir}/assets`,
			static: false,
			resolve: true
		};

		this.snowpack_config.mount[resolve(this.config.files.routes)] = {
			url: `/${this.config.appDir}/routes`,
			static: false,
			resolve: true
		};

		this.snowpack_config.mount[resolve(this.config.files.setup)] = {
			url: `/${this.config.appDir}/setup`,
			static: false,
			resolve: true
		};

		this.snowpack = await snowpack.startDevServer({
			cwd: process.cwd(),
			config: this.snowpack_config,
			lockfile: null,
			pkgManifest: pkg
		});
	}

	async init_server() {
		const load = loader(this.snowpack, this.snowpack_config);

		const { set_paths } = await load(
			`/${this.config.appDir}/assets/runtime/internal/singletons.js`
		);
		set_paths(this.config.paths);

		const static_handler = sirv(this.config.files.assets, {
			dev: true
		});

		this.server = createServer(async (req, res) => {
			if (req.url === '/' && req.headers.upgrade === 'websocket') {
				return this.snowpack.handleRequest(req, res);
			}

			const parsed = parse(req.url);

			static_handler(req, res, async () => {
				try {
					await this.snowpack.handleRequest(req, res, { handleError: false });
					return;
				} catch (err) {
					if (err.message !== 'NOT_FOUND') {
						this.snowpack.sendResponseError(req, res, 500);
						return;
					}
				}

				if (req.url === '/favicon.ico') return;

				const template = readFileSync(this.config.files.template, 'utf-8').replace(
					'</head>',
					`
						<script>window.HMR_WEBSOCKET_URL = \`ws://\${location.hostname}:${this.snowpack_port}\`;</script>
						<script type="module" src="/__snowpack__/hmr-client.js"></script>
						<script type="module" src="/__snowpack__/hmr-error-overlay.js"></script>
					</head>`.replace(/^\t{6}/gm, '')
				);

				let setup;

				try {
					setup = await load(`/${this.config.appDir}/setup/index.js`);
				} catch (err) {
					if (!err.message.endsWith('NOT_FOUND')) throw err;
					setup = {};
				}

				let root;

				try {
					root = (await load(`/${this.config.appDir}/assets/generated/root.js`)).default;
				} catch (e) {
					res.statusCode = 500;
					res.end(e.stack);
					return;
				}

				const body = await get_body(req);

				const rendered = await render(
					{
						host: this.config.host || req.headers.host,
						headers: req.headers,
						method: req.method,
						path: parsed.pathname,
						query: new URLSearchParams(parsed.query),
						body
					},
					{
						static_dir: this.config.files.assets,
						paths: this.config.paths,
						template: ({ head, body }) =>
							template.replace('%svelte.head%', () => head).replace('%svelte.body%', () => body),
						manifest: this.manifest,
						target: this.config.target,
						client: {
							entry: 'assets/runtime/internal/start.js',
							deps: {}
						},
						dev: true,
						root,
						setup,
						load: (route) => load(route.url.replace(/\.\w+$/, '.js')),
						only_prerender: false,
						start_global: this.config.startGlobal,
						app_dir: this.config.appDir,
						host: this.config.host
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
		});

		this.server.listen(this.port);
	}

	update() {
		this.manifest = create_manifest_data(this.config);

		create_app({
			manifest_data: this.manifest,
			output: '.svelte/assets'
		});
	}

	close() {
		if (this.closed) return;
		this.closed = true;

		this.server.close();
		this.cheapwatch.close();
		this.snowpack.shutdown();
	}
}
