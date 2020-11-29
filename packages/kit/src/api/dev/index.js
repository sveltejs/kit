import { readFileSync } from 'fs';
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

		this.cachedir = scorta('svelte') ;
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
		await this.init_snowpack();
		await this.init_server();

		this.emit('ready', {
			port: this.port
		});

		return this;
	}

	async init_filewatcher() {
		this.cheapwatch = new CheapWatch({
			dir: this.config.paths.routes,
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
		this.snowpack_port = await ports.find(this.port + 1);
		this.snowpack_config = snowpack.loadAndValidateConfig(
			{
				config: 'snowpack.config.js',
				port: this.snowpack_port
			},
			pkg
		);

		this.snowpack_config.mount[resolve(this.config.paths.routes)] = { url: '/_app/routes', static: false, resolve: true };
		this.snowpack_config.mount[resolve(this.config.paths.setup)] = { url: '/_app/setup', static: false, resolve: true };

		this.snowpack = await snowpack.startDevServer({
			cwd: process.cwd(),
			config: this.snowpack_config,
			lockfile: null,
			pkgManifest: pkg
		});
	}

	async init_server() {
		const load = loader(this.snowpack, this.snowpack_config);

		const static_handler = sirv(this.config.paths.static, {
			dev: true
		});

		this.server = createServer(async (req, res) => {
			if (req.url === '/' && req.headers.upgrade === 'websocket') {
				return this.snowpack.handleRequest(req, res);
			}

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

				const template = readFileSync(this.config.paths.template, 'utf-8').replace(
					'</head>',
					`
						<script>window.HMR_WEBSOCKET_URL = \`ws://localhost:${this.snowpack_port}\`;</script>
						<script type="module" src="http://localhost:3000/__snowpack__/hmr-client.js"></script>
						<script type="module" src="http://localhost:3000/__snowpack__/hmr-error-overlay.js"></script>
					</head>`.replace(/^\t{6}/gm, '')
				);

				const parsed = parse(req.url);
				let setup;

				try {
					setup = await load('/_app/setup/index.js');
				} catch (err) {
					if (!err.message.endsWith('NOT_FOUND')) throw err;
					setup = {};
				}

				let root;

				try {
					root = (await load('/_app/assets/generated/root.js')).default;
				} catch (e) {
					res.statusCode = 500;
					res.end(e.toString());
					return;
				}

				const body = await get_body(req);

				const rendered = await render(
					{
						host: req.headers.host,
						headers: req.headers,
						method: req.method,
						path: parsed.pathname,
						query: new URLSearchParams(parsed.query),
						body
					},
					{
						static_dir: this.config.paths.static,
						template,
						manifest: this.manifest,
						target: this.config.target,
						client: {
							entry: 'assets/app/navigation.js',
							deps: {}
						},
						dev: true,
						root,
						setup,
						load: (route) => load(route.url.replace(/\.\w+$/, '.js')), // TODO is the replace still necessary?
						only_prerender: false
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
		this.manifest = create_manifest_data(this.config.paths.routes);

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
