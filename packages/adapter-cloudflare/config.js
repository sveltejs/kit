/** @import { WorkerConfig } from '@cloudflare/vite-plugin' */
/** @import { Plugin } from 'vite' */
import { fileURLToPath } from 'node:url';
import { cloudflare } from '@cloudflare/vite-plugin';
import { is_dev_or_build, needs_nodejs_als, validate_main } from './utils.js';

const worker_entry = fileURLToPath(new URL('./files/worker.js', import.meta.url));

const useful_cloudflare_plugins = new Set([
	// resolves the plugin config that the other plugins read
	'vite-plugin-cloudflare',
	// alias Node.js builtins to the polyfills workerd uses and leave the rest as imports
	'vite-plugin-cloudflare:nodejs-als',
	'vite-plugin-cloudflare:nodejs-compat',
	'vite-plugin-cloudflare:nodejs-compat-warnings',
	// turns `.wasm?init` imports into `.wasm` imports
	'vite-plugin-cloudflare:wasm-helper'
]);

const useful_cloudflare_build_plugins = new Set(['vite-plugin-cloudflare:output-config']);

/** @type {NonNullable<Plugin['apply']>} */
const is_preview = (_config, env) => env.isPreview === true;

/** @type {NonNullable<Plugin['apply']>} */
const is_build_or_preview = (_config, env) => env.isPreview === true || env.command === 'build';

/**
 * @param {string | undefined} config_path
 * @param {(config: WorkerConfig) => void} set_worker_config
 * @param {string[]} server_entries paths, without the file extension, to the hooks and
 * instrumentation files. Vite scans them for dependencies along with the route files
 * @param {boolean} worker whether a Worker is deployed
 * @returns {Plugin[]}
 */
export function plugin_config(config_path, set_worker_config, server_entries, worker) {
	const cloudflare_plugins = cloudflare({
		configPath: config_path,
		viteEnvironment: { name: 'ssr' },
		config(config) {
			validate_main(config.main, config.configPath, worker);

			// the plugin requires `main` to be populated, so we set it to avoid it
			// trying to resolve the build-generated entry in the user's wrangler config
			config.main = worker_entry;
			config.assets ??= {};
			config.assets.binding ??= 'ASSETS';

			// Svelte and SvelteKit use `node:async_hooks`
			if (needs_nodejs_als(config.compatibility_date, config.compatibility_flags)) {
				config.compatibility_flags.push('nodejs_als');
			}

			set_worker_config(config);
		}
	});

	const cloudflare_config_plugin = cloudflare_plugins.find(
		(plugin) => plugin.name === 'vite-plugin-cloudflare:config'
	);
	const cloudflare_config_hook = cloudflare_config_plugin?.config;

	if (typeof cloudflare_config_hook !== 'function') {
		throw new Error(
			"Failed to find the vite-plugin-cloudflare:config plugin's config hook. This should not happen."
		);
	}

	return [
		...cloudflare_plugins.flatMap(
			/** @returns {Plugin[]} */ (plugin) => {
				if (useful_cloudflare_plugins.has(plugin.name)) {
					return [{ ...plugin, apply: undefined }];
				}

				if (useful_cloudflare_build_plugins.has(plugin.name)) {
					return [{ ...plugin, apply: is_build_or_preview }];
				}

				// leaves `.wasm` imports in the server output for workerd to import
				if (plugin.name === 'vite-plugin-cloudflare:additional-modules') {
					const resolve_id = /** @type {Extract<Plugin['resolveId'], { handler: unknown }>} */ (
						plugin.resolveId
					);

					const wasm = /\.wasm(\?module)?$/;

					return [
						{
							...plugin,
							apply: 'build',
							resolveId: {
								filter: { id: [wasm, /^#/] },
								async handler(source, importer, options) {
									const resolved = await this.resolve(source, importer, options);
									// it also handles `.txt`, `.html`, `.sql` and `.bin` imports, which we leave to vite
									if (!resolved || !wasm.test(resolved.id)) return resolved;

									return resolve_id.handler.call(this, source, importer, options);
								}
							}
						}
					];
				}

				// the rest are only needed to run the built Worker in workerd during preview
				return [{ ...plugin, apply: is_preview }];
			}
		),
		{
			name: 'vite-plugin-sveltekit-adapter-cloudflare-environment',
			apply: is_dev_or_build,
			async config(user_config, env) {
				const cloudflare_ssr = (await cloudflare_config_hook.call(this, user_config, env))
					?.environments?.ssr;

				if (cloudflare_ssr === undefined) {
					throw new Error(
						'Failed to get the SSR environment config from @cloudflare/vite-plugin. This should not happen.'
					);
				}

				return {
					environments: {
						ssr: {
							keepProcessEnv: cloudflare_ssr.keepProcessEnv,
							define: cloudflare_ssr.define,
							resolve: {
								noExternal: cloudflare_ssr.resolve?.noExternal,
								// `browser` is a legacy condition Cloudflare can't remove yet
								// but has recommended us to remove it ourselves
								conditions: cloudflare_ssr.resolve?.conditions?.filter(
									(condition) => condition !== 'browser'
								),
								// we resolve `cloudflare:workers` to a stub that runs in Node
								builtins: cloudflare_ssr.resolve?.builtins?.filter(
									(id) => id !== 'cloudflare:workers'
								)
							},
							optimizeDeps: {
								...cloudflare_ssr.optimizeDeps,
								// avoid optimising the Wrangler `main` entry, which points to our build-only worker
								entries: undefined
							},
							build: {
								target: cloudflare_ssr.build?.target,
								rolldownOptions: {
									platform: cloudflare_ssr.build?.rolldownOptions?.platform,
									resolve: cloudflare_ssr.build?.rolldownOptions?.resolve
								}
							}
						}
					}
				};
			}
		},
		{
			name: 'vite-plugin-sveltekit-adapter-cloudflare-config',
			apply: is_dev_or_build,
			config: {
				// runs after SvelteKit has configured the client's dependency optimisation
				order: 'post',
				handler(config) {
					const { entries = [], exclude = [] } = config.optimizeDeps ?? {};

					return {
						environments: {
							ssr: {
								optimizeDeps: {
									// Prebundle dependencies before the first request, otherwise
									// a dependency found while handling a request reloads the
									// module graph and can fail that request
									entries: [
										// Follow the route entries SvelteKit already specifies but
										// drop the `!` pattern that excludes `+server` and `+page.server`
										...[entries].flat().filter((entry) => !entry.startsWith('!')),
										...server_entries.map((file) => `${file}.{js,ts}`)
									],
									include: ['@sveltejs/kit > devalue', '@sveltejs/kit > esm-env'],
									exclude,
									rolldownOptions: {
										plugins: [
											// avoid optimising modules which don't exist yet
											{
												name: 'rolldown-plugin-sveltekit-adapter-cloudflare-env',
												resolveId: {
													filter: { id: /^\$(app|env)\// },
													handler: (id) => ({ id, external: true })
												}
											}
										]
									}
								}
							}
						}
					};
				}
			},
			configEnvironment: {
				order: 'post',
				handler(name, config) {
					if (name !== 'ssr') return;

					// Cloudflare's Vite plugin doesn't allow external SSR deps
					config.resolve ??= {};
					config.resolve.external = [];
				}
			},
			// lets the Cloudflare output-config Vite plugin read the resolved Vite config
			configResolved: cloudflare_config_plugin?.configResolved
		}
	];
}
