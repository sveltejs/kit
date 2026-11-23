/** @import { WorkerConfig } from '@cloudflare/vite-plugin' */
/** @import { Plugin } from 'vite' */
import { fileURLToPath } from 'node:url';
import { cloudflare } from '@cloudflare/vite-plugin';
import { needs_nodejs_als, validate_main } from './utils.js';

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

/** @type {Plugin['apply']} */
export const is_dev_or_build = (_config, env) => !env.isPreview;

/**
 * Applies the Worker environment config that `@cloudflare/vite-plugin` generates
 * so that dev emulates workerd and the server output suits it.
 * It also generates the Wrangler deployment config for the build output
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
		...cloudflare_plugins.flatMap((plugin) => {
			if (useful_cloudflare_plugins.has(plugin.name)) {
				return [{ ...plugin, apply: is_dev_or_build }];
			}

			if (useful_cloudflare_build_plugins.has(plugin.name)) {
				return /** @satisfies {Plugin[]} */ ([{ ...plugin, apply: 'build' }]);
			}

			// leaves `.wasm` imports in the server output for workerd to import
			if (plugin.name === 'vite-plugin-cloudflare:additional-modules') {
				const resolve_id = /** @type {Extract<Plugin['resolveId'], { handler: unknown }>} */ (
					plugin.resolveId
				);

				const render_chunk = /** @type {Extract<Plugin['renderChunk'], { handler: unknown }>} */ (
					plugin.renderChunk
				);

				const wasm = /\.wasm(\?module)?$/;
				const reference = /__CLOUDFLARE_MODULE__\w+?__.*?__CLOUDFLARE_MODULE__/g;
				/**
				 * the references cloudflare created for real `.wasm` imports
				 * @type {Set<string>}
				 */
				const references = new Set();

				return /** @satisfies {Plugin[]} */ ([
					{
						...plugin,
						apply: 'build',
						resolveId: {
							filter: { id: [wasm, /^#/] },
							async handler(source, importer, options) {
								const resolved = await this.resolve(source, importer, options);
								// it also handles `.txt`, `.html`, `.sql` and `.bin` imports, which we leave to vite
								if (!resolved || !wasm.test(resolved.id)) return resolved;

								// keep track of non-JavaScript modules recognised by Cloudflare
								const result = await resolve_id.handler.call(this, source, importer, options);
								if (result && typeof result === 'object') references.add(result.id);
								return result;
							}
						},
						renderChunk: {
							...render_chunk,
							async handler(code, ...args) {
								const masked = code.replace(reference, (match) =>
									references.has(match) ? match : `\0${match.slice(1)}`
								);
								const result = /** @type {{ code: string } | undefined} */ (
									await render_chunk.handler.call(this, masked, ...args)
								);
								if (!result) return;

								return { ...result, code: result.code.replaceAll('\0_CLOUDFLARE', '__CLOUDFLARE') };
							}
						}
					}
				]);
			}

			return [];
		}),
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
