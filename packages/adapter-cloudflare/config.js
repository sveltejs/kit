/** @import { CloudflareConfig } from '@cloudflare/vite-plugin' */
/** @import { PluginOptions } from './index.js' */
/** @import { Plugin } from 'vite' */
import { fileURLToPath } from 'node:url';
import { cloudflare } from '@cloudflare/vite-plugin';
import { is_dev_or_build, validate_entrypoint } from './utils.js';

const worker_entry = fileURLToPath(new URL('./files/worker.js', import.meta.url));

const useful_cloudflare_plugins = new Set([
	// resolves the plugin config that the other plugins read
	'vite-plugin-cloudflare',
	// alias Node.js builtins to the polyfills workerd uses and leave the rest as imports
	'vite-plugin-cloudflare:nodejs-als',
	'vite-plugin-cloudflare:nodejs-compat',
	'vite-plugin-cloudflare:nodejs-compat-warnings'
]);

const useful_cloudflare_build_plugins = new Set([
	'vite-plugin-cloudflare:wasm-helper',
	'vite-plugin-cloudflare:additional-modules'
]);

/**
 * @param {(config: CloudflareConfig) => void} set_cloudflare_config
 * @param {string[]} [scan_entries] the files Vite scans for the SSR environment's dependencies
 * @param {PluginOptions} [plugin_options]
 * @returns {Plugin[]}
 */
export function plugin_config(set_cloudflare_config, scan_entries, plugin_options = {}) {
	const cloudflare_plugins = cloudflare({
		...plugin_options,
		viteEnvironment: { name: 'ssr' },
		config(config) {
			validate_entrypoint(config.worker.entrypoint);

			const env = { ...config.worker.env };
			if (!Object.values(env).some((binding) => binding.type === 'assets')) {
				env.ASSETS = { type: 'assets' };
			}

			/** @type {CloudflareConfig} */
			const customized = {
				...config,
				worker: {
					...config.worker,
					// the plugin needs an entrypoint for the Worker environment. Ours stands in
					// for the build-generated entry that the adapter writes after the build
					entrypoint: worker_entry,
					// Svelte and SvelteKit use `node:async_hooks`
					compatibilityFlags: [
						...new Set([...(config.worker.compatibilityFlags ?? []), 'nodejs_als'])
					],
					env
				}
			};

			set_cloudflare_config(customized);

			return customized;
		}
	});

	const cloudflare_config_plugin = cloudflare_plugins.find(
		(plugin) => plugin.name === 'vite-plugin-cloudflare:config'
	);
	const cloudflare_config_hook = cloudflare_config_plugin?.config;
	const cloudflare_config_resolved_hook = cloudflare_config_plugin?.configResolved;

	if (typeof cloudflare_config_hook !== 'function') {
		throw new Error(
			"Failed to find the vite-plugin-cloudflare:config plugin's config hook. This should not happen."
		);
	}

	return [
		...cloudflare_plugins.map(
			(plugin) =>
				/** @satisfies {Plugin} */ ({
					...plugin,
					apply: (_config, env) =>
						env.isPreview === true ||
						useful_cloudflare_plugins.has(plugin.name) ||
						(env.command === 'build' && useful_cloudflare_build_plugins.has(plugin.name))
				})
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
								// `browser` would resolve `esm-env` to `BROWSER = true` and similar
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
								// the plugin's entry is our stand-in entrypoint, so we scan the app instead.
								// Otherwise, dependencies found during the first request reload the module
								// graph and fail that request
								entries: scan_entries,
								include: [
									...(cloudflare_ssr.optimizeDeps?.include ?? []),
									'@sveltejs/kit > cookie',
									'@sveltejs/kit > devalue',
									'@sveltejs/kit > esm-env'
								]
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
			configEnvironment: {
				order: 'post',
				handler(name, config) {
					if (name !== 'ssr') return;

					// Cloudflare's Vite plugin doesn't allow external SSR deps
					config.resolve ??= {};
					config.resolve.external = [];
				}
			},
			configResolved(config) {
				if (typeof cloudflare_config_resolved_hook !== 'function') return;

				// the other Cloudflare plugins read the resolved Vite config from this hook, but it also
				// points the environments' `build.outDir` at the build output, which the adapter writes
				// itself, so we give it copies of the environments to leave SvelteKit's output alone
				return cloudflare_config_resolved_hook.call(this, {
					...config,
					environments: Object.fromEntries(
						Object.entries(config.environments).map(([name, environment]) => [
							name,
							{ ...environment, build: { ...environment.build } }
						])
					)
				});
			}
		}
	];
}
