import { EventEmitter } from 'events';
import CheapWatch from 'cheap-watch';
import find_cache_dir from 'find-cache-dir';
import * as ports from 'port-authority';
import sirv from 'sirv';
import create_manifest_data from '../../core/create_manifest_data';
import { createServer, Server } from 'http';
import { create_app } from '../../core/create_app';
import snowpack from 'snowpack';
import pkg from '../../../package.json';
import loader from './loader';
import { ManifestData, ReadyEvent } from '../../interfaces';
import { render } from '@sveltejs/app-utils';
import { DevConfig, Loader } from './types';
import { copy_assets } from '../utils';
import { mkdirp } from '../../utils';
import { readFileSync } from 'fs';

export function dev(opts: DevConfig) {
	return new Watcher(opts);
}

class Watcher extends EventEmitter {
	cachedir: string;
	opts: DevConfig;
	manifest: ManifestData;

	cheapwatch: CheapWatch;

	snowpack_port: number;
	snowpack: any; // TODO types
	server: Server;

	constructor(opts: DevConfig) {
		super();

		this.cachedir = find_cache_dir({ name: 'svelte' });
		this.opts = opts;
		this.update();

		process.env.NODE_ENV = 'development';

		process.on('exit', () => {
			this.close();
		});

		this.init();
	}

	async init() {
		mkdirp('.svelte');

		copy_assets();

		await this.init_filewatcher();

		this.emit('ready', {
			port: this.opts.port
		} as ReadyEvent);
	}

	async init_filewatcher() {
		this.cheapwatch = new CheapWatch({
			dir: 'src/routes', // TODO make configurable...
			filter: ({ path }) => path.split('/').every(part => !part.startsWith('_'))
		});

		await this.cheapwatch.init();
		await this.init_snowpack();
		await this.init_server();

		// not sure why TS doesn't understand that CheapWatch extends EventEmitter
		(this.cheapwatch as any as EventEmitter).on('+', ({ isNew }) => {
			if (isNew) this.update();
		});

		(this.cheapwatch as any as EventEmitter).on('-', () => {
			this.update();
		});
	}

	async init_snowpack() {
		this.snowpack_port = await ports.find(this.opts.port + 1);

		this.snowpack = await snowpack.unstable__startServer({
			cwd: process.cwd(),
			config: snowpack.unstable__loadAndValidateConfig({
				config: 'snowpack.config.js',
				port: this.snowpack_port
			}, pkg),
			lockfile: null,
			pkgManifest: pkg
		});
	}

	async init_server() {
		const { port } = this.opts;
		const { snowpack_port } = this;
		const load: Loader = loader(this.snowpack.loadByUrl);

		const static_handler = sirv('static', {
			dev: true
		});

		this.server = createServer(async (req, res) => {
			if (req.url === '/' && req.headers.upgrade === 'websocket') {
				// TODO this fails (see https://github.com/sveltejs/kit/issues/1)
				return this.snowpack.requestHandler(req, res);
			}

			static_handler(req, res, () => {
				this.snowpack.requestHandler(req, res, async () => {
					const session = {}; // TODO

					const template = readFileSync('src/app.html', 'utf-8').replace(
						'</head>',
						`<script>window.HMR_WEBSOCKET_URL = \`ws://localhost:${snowpack_port}\`;</script></head>`
					);

					const rendered = await render({
						static_dir: 'static',
						template,
						manifest: this.manifest,
						client: {
							entry: 'main/client.js',
							deps: {}
						},
						files: 'build',
						host: req.headers.host,
						url: req.url,
						dev: true,
						App: await load(`/_app/main/App.js`),
						load: route => load(route.url.replace(/\.\w+$/, '.js'))
					});

					if (rendered) {
						res.writeHead(rendered.status, rendered.headers);
						res.end(rendered.body);
					}

					else {
						res.statusCode = 404;
						res.end('Not found');
					}
				});
			});
		});

		this.server.listen(port);
	}

	update() {
		this.manifest = create_manifest_data('src/routes'); // TODO make configurable, without breaking Snowpack config

		create_app({
			manifest_data: this.manifest,
			routes: '/_app/routes',
			output: '.svelte/main'
		});
	}

	close() {
		if (this.server) this.server.close();
	}
}