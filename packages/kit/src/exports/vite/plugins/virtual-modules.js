/** @import { EnvVarConfig } from '@sveltejs/kit' */
/** @import { ValidatedConfig } from 'types' */
/** @import { Plugin, ResolvedConfig } from 'vite' */
import * as sync from '../../../core/sync/sync.js';
import { loadEnv } from 'vite';
import {
	create_sveltekit_env,
	create_sveltekit_env_private,
	create_sveltekit_env_public,
	create_sveltekit_env_service_worker_dev,
	resolve_explicit_env_entry
} from '../../../core/env.js';
import {
	service_worker,
	sveltekit_env,
	sveltekit_env_private,
	sveltekit_env_public_client,
	sveltekit_env_public_server,
	sveltekit_env_service_worker,
	sveltekit_server
} from '../module_ids.js';
import { runtime_directory } from '../../../core/utils.js';
import { exactRegex } from 'rolldown/filter';
import { create_service_worker_module } from '../index.js';
import { dedent } from '../../../core/sync/utils.js';
import { hash } from '../../../utils/hash.js';

/**
 * @param {ValidatedConfig} sveltekit_config
 * @returns {Plugin}
 */
export function plugin_virtual_modules(sveltekit_config) {
	/** @type {string | null} */
	let explicit_env_entry = null;

	/** @type {Record<string, EnvVarConfig<any>> | null} */
	let explicit_env_config = null;

	/** @type {ResolvedConfig} */
	let vite_config;

	/** @type {Record<string, string>} */
	let env;

	const version_hash = hash(sveltekit_config.kit.version.name);

	return {
		name: 'vite-plugin-sveltekit-virtual-modules',

		applyToEnvironment(environment) {
			return environment.name !== 'serviceWorker';
		},

		async configResolved(config) {
			vite_config = config;
			env = loadEnv(config.mode, sveltekit_config.kit.env.dir, '');

			explicit_env_entry = resolve_explicit_env_entry(sveltekit_config);
			explicit_env_config = await sync.env(
				sveltekit_config.kit,
				explicit_env_entry,
				config.root,
				config.mode
			);
		},

		configureServer(server) {
			server.watcher.on('all', async (_, file) => {
				if (!file.includes('env')) {
					return;
				}

				const resolved = resolve_explicit_env_entry(sveltekit_config);

				if (file === explicit_env_entry || file === resolved) {
					explicit_env_entry = resolved;
					explicit_env_config = await sync.env(
						sveltekit_config.kit,
						explicit_env_entry,
						vite_config.root,
						vite_config.mode
					);

					for (const id of [sveltekit_env, sveltekit_env_public_client]) {
						const module = server.moduleGraph.getModuleById(id);

						if (module) {
							server.moduleGraph.invalidateModule(module);
						}
					}

					server.ws.send({ type: 'full-reload' });
				}
			});
		},

		resolveId(id, importer) {
			if (id === '__sveltekit/manifest') {
				return `${sveltekit_config.kit.outDir}/generated/client-optimized/app.js`;
			}

			// // If importing from a service-worker, only allow $service-worker & $app/env/public, but none of the other virtual modules.
			// // This check won't catch transitive imports, but it will warn when the import comes from a service-worker directly.
			// // Transitive imports will be caught during the build.
			// // TODO move this logic to plugin_guard. add a filter to this resolveId when doing so
			// // TODO allow $app/env/public
			// if (importer) {
			// 	const parsed_importer = path.parse(importer);

			// 	const importer_is_service_worker =
			// 		parsed_importer.dir === parsed_service_worker.dir &&
			// 		parsed_importer.name === parsed_service_worker.name;

			// 	if (
			// 		importer_is_service_worker &&
			// 		id !== '$service-worker' &&
			// 		id !== 'virtual:$app/env/public' &&
			// 		id !== '__sveltekit/env/service-worker'
			// 	) {
			// 		throw new Error(
			// 			`Cannot import ${normalize_id(
			// 				id,
			// 				normalized_lib,
			// 				normalized_cwd
			// 			)} into service-worker code. Only the modules $service-worker and $app/env/public are available in service workers.`
			// 		);
			// 	}
			// }

			if (id === '$service-worker') {
				// ids with :$ don't work with reverse proxies like nginx
				return `\0virtual:${id.substring(1)}`;
			}

			if (id === '__sveltekit/remote') {
				return `${runtime_directory}/client/remote-functions/index.js`;
			}

			if (id.startsWith('__sveltekit/') && id !== '__sveltekit/dev-server-entry.js') {
				return `\0virtual:${id}`;
			}
		},
		load: {
			filter: {
				id: [
					exactRegex(service_worker),
					exactRegex(sveltekit_env),
					exactRegex(sveltekit_env_private),
					exactRegex(sveltekit_env_public_client),
					exactRegex(sveltekit_env_public_server),
					exactRegex(sveltekit_env_service_worker),
					exactRegex(sveltekit_server)
				]
			},
			handler(id) {
				const global =
					vite_config.command === 'build'
						? `globalThis.__sveltekit_${version_hash}`
						: 'globalThis.__sveltekit_dev';

				switch (id) {
					case service_worker:
						return create_service_worker_module(sveltekit_config);

					case sveltekit_env:
						return create_sveltekit_env(explicit_env_config, env, explicit_env_entry);

					case sveltekit_env_public_client:
						return create_sveltekit_env_public(
							explicit_env_config,
							env,
							`const env = ${global}.env;`
						);

					case sveltekit_env_public_server:
						return create_sveltekit_env_public(
							explicit_env_config,
							env,
							`import { rendered_env as env } from '__sveltekit/env';`
						);

					case sveltekit_env_private:
						return create_sveltekit_env_private(explicit_env_config, env);

					case sveltekit_env_service_worker:
						return create_sveltekit_env_service_worker_dev(explicit_env_config, env, global);

					case sveltekit_server: {
						return dedent`
							export let read_implementation = null;

							export let manifest = null;

							export function set_read_implementation(fn) {
								read_implementation = fn;
							}

							export function set_manifest(_) {
								manifest = _;
							}
						`;
					}
				}
			}
		}
	};
}
