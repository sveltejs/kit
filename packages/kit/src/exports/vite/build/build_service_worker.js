import fs from 'node:fs';
import * as vite from 'vite';
import { s } from '../../../utils/misc.js';
import { get_config_aliases } from '../utils.js';
import { assets_base } from './utils.js';

/**
 * @param {string} out
 * @param {import('types').ValidatedKitConfig} kit
 * @param {import('vite').ResolvedConfig} vite_config
 * @param {import('types').ManifestData} manifest_data
 * @param {string} service_worker_entry_file
 * @param {import('types').Prerendered} prerendered
 * @param {import('vite').Manifest} client_manifest
 */
export async function build_service_worker(
	out,
	kit,
	vite_config,
	manifest_data,
	service_worker_entry_file,
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

	const service_worker = `${kit.outDir}/generated/service-worker.js`;

	fs.writeFileSync(
		service_worker,
		`
			export const build = [
				${Array.from(build)
					.map((file) => `${s(`${kit.paths.base}/${file}`)}`)
					.join(',\n\t\t\t\t')}
			];

			export const files = [
				${manifest_data.assets
					.filter((asset) => kit.serviceWorker.files(asset.file))
					.map((asset) => `${s(`${kit.paths.base}/${asset.file}`)}`)
					.join(',\n\t\t\t\t')}
			];

			export const prerendered = [
				${prerendered.paths.map((path) => s(path)).join(',\n\t\t\t\t')}
			];

			export const version = ${s(kit.version.name)};
		`
			.replace(/^\t{3}/gm, '')
			.trim()
	);

	await vite.build({
		base: assets_base(kit),
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
			outDir: `${out}/client`,
			emptyOutDir: false
		},
		define: vite_config.define,
		configFile: false,
		resolve: {
			alias: [...get_config_aliases(kit), { find: '$service-worker', replacement: service_worker }]
		}
	});
}
