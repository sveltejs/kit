import * as vite from 'vite';
import { dedent } from '../../../core/sync/utils.js';
import { s } from '../../../utils/misc.js';
import { get_config_aliases, strip_virtual_prefix, get_env } from '../utils.js';
import { assets_base } from './utils.js';
import { create_static_module } from '../../../core/env.js';

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

	// in a service worker, `location` is the location of the service worker itself,
	// which is guaranteed to be `<base>/service-worker.js`
	const base = "location.pathname.split('/').slice(0, -1).join('/')";

	const $serviceWorkerCode = dedent`
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
		];s

		export const prerendered = [
			${prerendered.paths.map((path) => `base + ${s(path.replace(kit.paths.base, ''))}`).join(',\n')}
		];

		export const version = ${s(kit.version.name)};
	`;

	const env = get_env(kit.env, vite_config.mode);

	/**
	 * @type {import('vite').Plugin}
	 */
	const sw_virtual_modules = {
		name: 'service-worker-build-virtual-modules',
		async resolveId(id) {
			if (id.startsWith('$env/') || id.startsWith('$app/') || id === '$service-worker') {
				return `\0virtual:${id}`;
			}
		},

		async load(id) {
			if(!id.startsWith('\0virtual:')) return;

			if (id === '\0virtual:$service-worker') {
				return $serviceWorkerCode;
			}

			if (id === '\0virtual:$env/static/public') {
				return create_static_module('$env/static/public', env.public);
			}

			throw new Error(
				`Cannot import ${strip_virtual_prefix(
					id
				)} into service-worker code. Only the modules $service-worker and $env/static/public are available in service workers.`
			);
		}
	};

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
		configFile: false,
		define: vite_config.define,
		publicDir: false,
		plugins: [sw_virtual_modules],
		resolve: {
			alias: [...get_config_aliases(kit)]
		}
	});
}
