import fs from 'fs';
import path from 'path';
import { mkdirp, rimraf, posixify } from '../../utils/filesystem.js';
import create_manifest_data from '../create_manifest_data/index.js';
import { SVELTE_KIT } from '../constants.js';
import { runtime, resolve_entry } from '../utils.js';
import { generate_manifest } from '../generate_manifest/index.js';
import { build_service_worker } from './build_service_worker.js';
import { build_client } from './build_client.js';
import { build_server } from './build_server.js';
import { generate_tsconfig } from '../tsconfig.js';

/**
 * @param {import('types').ValidatedConfig} config
 * @returns {Promise<import('types').BuildData>}
 */
export async function build(config) {
	const cwd = process.cwd(); // TODO is this necessary?

	const build_dir = path.resolve(`${SVELTE_KIT}/build`);
	rimraf(build_dir);
	mkdirp(build_dir);

	const output_dir = path.resolve(`${SVELTE_KIT}/output`);
	rimraf(output_dir);
	mkdirp(output_dir);

	generate_tsconfig(config);

	const options = {
		cwd,
		config,
		build_dir,
		// TODO this is so that Vite's preloading works. Unfortunately, it fails
		// during `svelte-kit preview`, because we use a local asset path. If Vite
		// used relative paths, I _think_ this could get fixed. Issue here:
		// https://github.com/vitejs/vite/issues/2009
		assets_base: `${config.kit.paths.assets || config.kit.paths.base}/${config.kit.appDir}/`,
		manifest_data: create_manifest_data({
			config,
			cwd
		}),
		output_dir,
		client_entry_file: path.relative(cwd, `${runtime}/client/start.js`),
		service_worker_entry_file: resolve_entry(config.kit.files.serviceWorker),
		service_worker_register: config.kit.serviceWorker.register
	};

	const client = await build_client(options);
	const server = await build_server(options, client);

	if (options.service_worker_entry_file) {
		if (config.kit.paths.assets) {
			throw new Error('Cannot use service worker alongside config.kit.paths.assets');
		}

		await build_service_worker(options, client.vite_manifest);
	}

	const build_data = {
		app_dir: config.kit.appDir,
		manifest_data: options.manifest_data,
		service_worker: options.service_worker_entry_file ? 'service-worker.js' : null, // TODO make file configurable?
		client,
		server,
		static: options.manifest_data.assets.map((asset) => posixify(asset.file)),
		entries: options.manifest_data.routes
			.map((route) => (route.type === 'page' ? route.path : ''))
			.filter(Boolean)
	};

	const manifest = `export const manifest = ${generate_manifest(build_data, '.')};\n`;
	fs.writeFileSync(`${output_dir}/server/manifest.js`, manifest);

	return build_data;
}
