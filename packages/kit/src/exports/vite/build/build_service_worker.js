import fs from 'fs';
import * as vite from 'vite';
import { s } from '../../../utils/misc.js';
import { assets_base } from './utils.js';

/**
 * @param {{
 *   config: import('types').ValidatedConfig;
 *   vite_config: import('vite').ResolvedConfig;
 *   vite_config_env: import('vite').ConfigEnv;
 *   manifest_data: import('types').ManifestData;
 *   output_dir: string;
 *   service_worker_entry_file: string | null;
 * }} options
 * @param {import('types').Prerendered} prerendered
 * @param {import('vite').Manifest} client_manifest
 */
export async function build_service_worker(
	{ config, vite_config, manifest_data, output_dir, service_worker_entry_file },
	prerendered,
	client_manifest
) {
	const build = new Set();
	for (const key in client_manifest) {
		const { file, css = [], assets = [] } = client_manifest[key];
		build.add(file);
		css.forEach((file) => build.add(file));
		assets.forEach((file) => build.add(file));
	}

	const service_worker = `${config.kit.outDir}/generated/service-worker.js`;

	fs.writeFileSync(
		service_worker,
		`
			// TODO remove for 1.0
			export const timestamp = {
				toString: () => {
					throw new Error('\`timestamp\` has been removed from $service-worker. Use \`version\` instead');
				}
			};

			export const build = [
				${Array.from(build)
					.map((file) => `${s(`${config.kit.paths.base}/${file}`)}`)
					.join(',\n\t\t\t\t')}
			];

			export const files = [
				${manifest_data.assets
					.filter((asset) => config.kit.serviceWorker.files(asset.file))
					.map((asset) => `${s(`${config.kit.paths.base}/${asset.file}`)}`)
					.join(',\n\t\t\t\t')}
			];

			export const prerendered = [
				${prerendered.paths.map((path) => s(path)).join(',\n\t\t\t\t')}
			];

			export const version = ${s(config.kit.version.name)};
		`
			.replace(/^\t{3}/gm, '')
			.trim()
	);

	await vite.build({
		base: assets_base(config.kit),
		build: {
			lib: {
				entry: /** @type {string} */ (service_worker_entry_file),
				name: 'app',
				formats: ['es']
			},
			rollupOptions: {
				output: {
					entryFileNames: 'service-worker.js'
				}
			},
			outDir: `${output_dir}/client`,
			emptyOutDir: false
		},
		define: vite_config.define,
		configFile: false,
		resolve: {
			alias: {
				'$service-worker': service_worker,
				$lib: config.kit.files.lib
			}
		}
	});
}
