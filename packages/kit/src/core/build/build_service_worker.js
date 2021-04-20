import fs from 'fs';
import path from 'path';
import vite from 'vite';
import { s } from '../../utils';

/**
 * @param {{
 *   cwd: string;
 *   base: string;
 *   config: import('types/config').ValidatedConfig
 *   manifest: import('types/internal').ManifestData
 *   build_dir: string;
 *   output_dir: string;
 *   client_entry_file: string;
 *   service_worker_entry_file: string;
 * }} options
 * @param {import('./types').ClientManifest} client_manifest
 */
export async function build_service_worker(
	{ cwd, base, config, manifest, build_dir, output_dir, service_worker_entry_file },
	client_manifest
) {
	// TODO add any assets referenced in template .html file, e.g. favicon?
	const app_files = new Set();
	for (const key in client_manifest) {
		const { file, css } = client_manifest[key];
		app_files.add(file);
		if (css) {
			css.forEach((file) => {
				app_files.add(file);
			});
		}
	}

	fs.writeFileSync(
		`${build_dir}/runtime/service-worker.js`,
		`
			export const timestamp = ${Date.now()};

			export const build = [
				${Array.from(app_files)
					.map((file) => `${s(`${config.kit.paths.base}/${config.kit.appDir}/${file}`)}`)
					.join(',\n\t\t\t\t')}
			];

			export const files = [
				${manifest.assets
					.map((asset) => `${s(`${config.kit.paths.base}/${asset.file}`)}`)
					.join(',\n\t\t\t\t')}
			];
		`
			.replace(/^\t{3}/gm, '')
			.trim()
	);

	/** @type {any} */
	const user_config = config.kit.vite();

	await vite.build({
		...user_config,
		configFile: false,
		root: cwd,
		base,
		build: {
			...user_config.build,
			lib: {
				entry: service_worker_entry_file,
				name: 'app',
				formats: ['es']
			},
			rollupOptions: {
				...(user_config.build && user_config.build.rollupOptions),
				output: {
					entryFileNames: 'service-worker.js'
				}
			},
			outDir: `${output_dir}/client`,
			emptyOutDir: false
		},
		resolve: {
			...user_config.resolve,
			alias: {
				...(user_config.resolve && user_config.resolve.alias),
				'$service-worker': path.resolve(`${build_dir}/runtime/service-worker`)
			}
		},
		optimizeDeps: {
			entries: []
		}
	});
}
