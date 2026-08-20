/** @import { ValidatedConfig } from 'types' */
/** @import { Plugin, UserConfig } from 'vite' */
import { runtime_directory } from '../../../core/utils.js';
import { posixify } from '../../../utils/os.js';
import { warn_overridden_config } from '../utils.js';

/**
 * @param {ValidatedConfig} kit
 * @param {() => { service_worker_entry_file: string | null; kit_global: string; out: string; initial_config: UserConfig; }} callback
 * @returns {Plugin}
 */
export function plugin_service_worker_build(kit, callback) {
	return {
		name: 'vite-plugin-sveltekit-service-worker',

		config(config) {
			const { service_worker_entry_file, kit_global, out, initial_config } = callback();

			if (!service_worker_entry_file) return;

			if (kit.paths.assets) {
				throw new Error('Cannot use service worker alongside config.paths.assets');
			}

			const user_service_worker_output_config =
				config.environments?.serviceWorker?.build?.rolldownOptions?.output;

			/** @type {UserConfig} */
			const new_config = {
				environments: {
					serviceWorker: {
						define: {
							__SVELTEKIT_PAYLOAD__: kit_global
						},
						build: {
							modulePreload: false,
							rolldownOptions: {
								external: [`${kit.paths.base}/${kit.appDir}/env.js`],
								input: {
									'service-worker': posixify(service_worker_entry_file)
								},
								output: {
									format: 'es',
									entryFileNames: 'service-worker.js',
									assetFileNames: `${kit.appDir}/immutable/assets/[name].[hash][extname]`,
									codeSplitting:
										(Array.isArray(user_service_worker_output_config)
											? user_service_worker_output_config[0].codeSplitting
											: user_service_worker_output_config?.codeSplitting) ?? false
								}
							},
							outDir: `${out}/client`,
							minify: initial_config.build?.minify,
							// avoid overwriting the client build Vite manifest
							manifest: '.vite/service-worker-manifest.json'
						},
						consumer: 'client'
					}
				}
			};

			warn_overridden_config(config, new_config);

			return new_config;
		},

		// our serviceWorker environment only exists when building because Vite only
		// supports the default client environment during development (for now)
		applyToEnvironment(environment) {
			return environment.name === 'serviceWorker';
		},

		generateBundle(_, bundle) {
			const invalid_modules = new Set();
			const modules = new Map([
				[`${runtime_directory}/app/forms/index.js`, '$app/forms'],
				[`${runtime_directory}/app/navigation/index.js`, '$app/navigation'],
				[`${runtime_directory}/app/state/index.js`, '$app/state']
			]);

			for (const output of Object.values(bundle)) {
				if (output.type !== 'chunk') continue;

				for (const id of output.moduleIds) {
					const module = modules.get(id);
					if (module) invalid_modules.add(module);
				}
			}

			if (invalid_modules.size > 0) {
				throw new Error(
					`Cannot import ${Array.from(modules.values())
						.filter((module) => invalid_modules.has(module))
						.join(', ')} into service-worker code.`
				);
			}
		}
	};
}
