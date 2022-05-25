import fs from 'fs';
import path from 'path';
import { mkdirp, rimraf, posixify } from '../../utils/filesystem.js';
import * as sync from '../sync/sync.js';
import { get_runtime_path, resolve_entry } from '../utils.js';
import { generate_manifest } from '../generate_manifest/index.js';
import { build_service_worker } from './build_service_worker.js';
import { build_client } from './build_client.js';
import { build_server } from './build_server.js';
import { prerender } from './prerender/prerender.js';

/**
 * @param {import('types').ValidatedConfig} config
 * @param {{ log: import('types').Logger }} opts
 */
export async function build(config, { log }) {
	const cwd = process.cwd(); // TODO is this necessary?

	const build_dir = path.join(config.kit.outDir, 'build');
	rimraf(build_dir);
	mkdirp(build_dir);

	const output_dir = path.join(config.kit.outDir, 'output');
	rimraf(output_dir);
	mkdirp(output_dir);

	const { manifest_data } = sync.all(config);

	// TODO this is so that Vite's preloading works. Unfortunately, it fails
	// during `svelte-kit preview`, because we use a local asset path. If Vite
	// used relative paths, I _think_ this could get fixed. Issue here:
	// https://github.com/vitejs/vite/issues/2009
	const { base, assets } = config.kit.paths;
	const assets_base = `${assets || base}/${config.kit.appDir}/immutable/`;

	const options = {
		cwd,
		config,
		build_dir,
		assets_base,
		manifest_data,
		output_dir,
		client_entry_file: path.relative(cwd, `${get_runtime_path(config)}/client/start.js`),
		service_worker_entry_file: resolve_entry(config.kit.files.serviceWorker),
		service_worker_register: config.kit.serviceWorker.register
	};

	const client = await build_client(options);
	const server = await build_server(options, client);

	/** @type {import('types').BuildData} */
	const build_data = {
		app_dir: config.kit.appDir,
		manifest_data: options.manifest_data,
		service_worker: options.service_worker_entry_file ? 'service-worker.js' : null, // TODO make file configurable?
		client,
		server
	};

	const manifest = `export const manifest = ${generate_manifest({
		build_data,
		relative_path: '.',
		routes: options.manifest_data.routes
	})};\n`;
	fs.writeFileSync(`${output_dir}/server/manifest.js`, manifest);

	const static_files = options.manifest_data.assets.map((asset) => posixify(asset.file));

	const files = new Set([
		...static_files,
		...client.chunks.map((chunk) => `${config.kit.appDir}/immutable/${chunk.fileName}`),
		...client.assets.map((chunk) => `${config.kit.appDir}/immutable/${chunk.fileName}`)
	]);

	// TODO is this right?
	static_files.forEach((file) => {
		if (file.endsWith('/index.html')) {
			files.add(file.slice(0, -11));
		}
	});

	const prerendered = await prerender({
		config,
		entries: options.manifest_data.routes
			.map((route) => (route.type === 'page' ? route.path : ''))
			.filter(Boolean),
		files,
		log
	});

	if (options.service_worker_entry_file) {
		if (config.kit.paths.assets) {
			throw new Error('Cannot use service worker alongside config.kit.paths.assets');
		}

		await build_service_worker(options, prerendered, client.vite_manifest);
	}

	return { build_data, prerendered };
}
