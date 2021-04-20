import path from 'path';
import { rimraf } from '../filesystem/index.js';
import create_manifest_data from '../../core/create_manifest_data/index.js';
import { posixify, resolve_entry } from '../utils.js';
import glob from 'tiny-glob/sync.js';
import { build_client } from './build_client.js';
import { build_server } from './build_server.js';
import { build_service_worker } from './build_service_worker.js';

/**
 * @param {import('types/config').ValidatedConfig} config
 * @param {{
 *   cwd?: string;
 *   runtime?: string;
 * }} [opts]
 * @returns {Promise<import('types/internal').BuildData>}
 */
export async function build(config, { cwd = process.cwd(), runtime = '@sveltejs/kit/ssr' } = {}) {
	const build_dir = path.resolve(cwd, '.svelte/build');

	rimraf(build_dir);

	const output_dir = path.resolve(cwd, '.svelte/output');

	const options = {
		cwd,
		config,
		build_dir,
		base:
			config.kit.paths.assets === '/.'
				? `/${config.kit.appDir}/`
				: `${config.kit.paths.assets}/${config.kit.appDir}/`,
		manifest: create_manifest_data({
			config,
			output: build_dir,
			cwd
		}),
		output_dir,
		client_entry_file: '.svelte/build/runtime/internal/start.js',
		service_worker_entry_file: resolve_entry(config.kit.files.serviceWorker)
	};

	const client_manifest = await build_client(options);
	await build_server(options, client_manifest, runtime);

	if (options.service_worker_entry_file) {
		const { base, assets } = config.kit.paths;

		if (assets !== base && assets !== '/.') {
			throw new Error('Cannot use service worker alongside config.kit.paths.assets');
		}

		await build_service_worker(options, client_manifest);
	}

	const client = glob('**', { cwd: `${output_dir}/client`, filesOnly: true }).map(posixify);
	const server = glob('**', { cwd: `${output_dir}/server`, filesOnly: true }).map(posixify);

	return {
		client,
		server,
		static: options.manifest.assets.map((asset) => posixify(asset.file)),
		entries: options.manifest.routes
			.map((route) => route.type === 'page' && route.path)
			.filter(Boolean)
	};
}
