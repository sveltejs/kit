import fs, { writeFileSync } from 'fs';
import path from 'path';
import { mkdirp, rimraf } from '../../utils/filesystem.js';
import create_manifest_data from '../create_manifest_data/index.js';
import { SVELTE_KIT } from '../constants.js';
import { posixify, resolve_entry } from '../utils.js';
import { generate_manifest } from '../generate_manifest/index.js';
import { s } from '../../utils/misc.js';
import { build_service_worker } from './build_service_worker.js';
import { build_client } from './build_client.js';
import { build_server } from './build_server.js';
import { find_deps } from './utils.js';

/**
 * @param {import('types/config').ValidatedConfig} config
 * @param {{
 *   cwd?: string;
 *   runtime?: string;
 * }} [opts]
 * @returns {Promise<import('types/internal').BuildData>}
 */
export async function build(config, { cwd = process.cwd(), runtime = './kit.js' } = {}) {
	const build_dir = path.resolve(cwd, `${SVELTE_KIT}/build`);

	rimraf(build_dir);

	const output_dir = path.resolve(cwd, `${SVELTE_KIT}/output`);

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
			output: build_dir,
			cwd
		}),
		output_dir,
		client_entry_file: `${SVELTE_KIT}/build/runtime/internal/start.js`,
		service_worker_entry_file: resolve_entry(config.kit.files.serviceWorker),
		service_worker_register: config.kit.serviceWorker.register
	};

	const client = await build_client(options);
	const server = await build_server(options, runtime);

	const styles_lookup = new Map();
	if (options.config.kit.amp) {
		client.assets.forEach((asset) => {
			if (asset.fileName.endsWith('.css')) {
				styles_lookup.set(asset.fileName, asset.source);
			}
		});
	}

	mkdirp(`${output_dir}/server/nodes`);
	options.manifest_data.components.forEach((component, i) => {
		const file = `${output_dir}/server/nodes/${i}.js`;

		const js = new Set();
		const css = new Set();
		find_deps(component, client.vite_manifest, js, css);

		const styles = config.kit.amp && Array.from(css).map((file) => styles_lookup.get(file));

		const node = `import * as module from '../${server.vite_manifest[component].file}';
			export { module };
			export const entry = '${client.vite_manifest[component].file}';
			export const js = ${JSON.stringify(Array.from(js))};
			export const css = ${JSON.stringify(Array.from(css))};
			${styles ? `export const styles = ${s(styles)}` : ''}
			`.replace(/^\t\t\t/gm, '');

		writeFileSync(file, node);
	});

	if (options.service_worker_entry_file) {
		if (config.kit.paths.assets) {
			throw new Error('Cannot use service worker alongside config.kit.paths.assets');
		}

		await build_service_worker(options, client.vite_manifest);
	}

	const build_data = {
		app_dir: config.kit.appDir,
		manifest_data: options.manifest_data,
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
