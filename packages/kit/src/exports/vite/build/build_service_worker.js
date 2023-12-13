import fs from 'node:fs';
import * as vite from 'vite';
import { dedent } from '../../../core/sync/utils.js';
import { s } from '../../../utils/misc.js';
import { get_config_aliases } from '../utils.js';

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

	// in a service worker, `location` is the location of the service worker itself,
	// which is guaranteed to be `<base>/service-worker.js`
	const base = "location.pathname.split('/').slice(0, -1).join('/')";

	fs.writeFileSync(
		service_worker,
		dedent`
			export const base = /*@__PURE__*/ ${base};

			export const build = [
				${Array.from(build)
					.map((file) => `base + ${s(`/${file}`)}`)
					.join(',\n')}
			];

			export const files = [
				${manifest_data.assets
					.filter((asset) => kit.serviceWorker.files(asset.file))
					.map((asset) => `base + ${s(`/${asset.file}`)}`)
					.join(',\n')}
			];

			export const prerendered = [
				${prerendered.paths.map((path) => `base + ${s(path.replace(kit.paths.base, ''))}`).join(',\n')}
			];

			export const version = ${s(kit.version.name)};
		`
	);

	await vite.build({
		build: {
			modulePreload: false,
			rollupOptions: {
				input: {
					'service-worker': service_worker_entry_file
				},
				output: {
					entryFileNames: '[name].js',
					assetFileNames: `${kit.appDir}/immutable/assets/[name].[hash][extname]`,
					inlineDynamicImports: true
				}
			},
			outDir: `${out}/client`,
			emptyOutDir: false
		},
		configFile: false,
		define: vite_config.define,
		publicDir: false,
		resolve: {
			alias: [...get_config_aliases(kit), { find: '$service-worker', replacement: service_worker }]
		},
		experimental: {
			renderBuiltUrl(filename) {
				return {
					runtime: `new URL(${JSON.stringify(filename)}, location.href).pathname`
				};
			}
		}
	});
}
