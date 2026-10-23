/** @import { Plugin } from 'vite' */
import { fileURLToPath } from 'node:url';
import { cloudflare } from '@cloudflare/vite-plugin';

const useful_cloudflare_plugins = new Set([
	// resolves the plugin config that the other plugins read
	'vite-plugin-cloudflare',
	// alias Node.js builtins to the polyfills workerd uses and leave the rest as imports
	'vite-plugin-cloudflare:nodejs-als',
	'vite-plugin-cloudflare:nodejs-compat',
	'vite-plugin-cloudflare:nodejs-compat-warnings'
]);

const build_output_plugins = new Set([
	// generate the output `wrangler.json` and handle Wasm and other non-JavaScript modules
	'vite-plugin-cloudflare:output-config',
	'vite-plugin-cloudflare:wasm-helper',
	'vite-plugin-cloudflare:additional-modules'
]);

/**
 * In preview, the plugin expects to read the output config from its own build pipeline,
 * which we don't use, so we leave `vite preview` to SvelteKit
 * @type {Plugin['apply']}
 */
const not_preview = (_config, env) => !env.isPreview;

const worker_entry = fileURLToPath(new URL('./files/worker.js', import.meta.url));

/**
 * Applies the Worker environment config that `@cloudflare/vite-plugin` generates
 * so that dev emulates workerd and the server output suits it. It also generates the
 * deployment config for the build output
 * @param {string | undefined} config_path
 * @returns {Plugin[]}
 */
export function plugin_config(config_path) {
	const plugins = cloudflare({
		configPath: config_path,
		viteEnvironment: { name: 'ssr' },
		config(config) {
			// the plugin requires `main` to be populated, so we set it to avoid it
			// trying to resolve build-generated entry in the user's wrangler config
			config.main = worker_entry;

			config.assets ??= {};
			config.assets.binding ??= 'ASSETS';
			if (
				!config.compatibility_flags.includes('nodejs_compat') &&
				!config.compatibility_flags.includes('nodejs_als')
			) {
				// SvelteKit uses `AsyncLocalStorage`
				config.compatibility_flags.push('nodejs_als');
			}
		}
	});

	const cloudflare_config_plugin = plugins.find(
		(plugin) => plugin.name === 'vite-plugin-cloudflare:config'
	);
	const cloudflare_config_hook = cloudflare_config_plugin?.config;

	if (typeof cloudflare_config_hook !== 'function') {
		throw new Error(
			"Failed to find the vite-plugin-cloudflare:config plugin's config hook. This should not happen."
		);
	}

	return [
		...plugins
			.filter((plugin) => useful_cloudflare_plugins.has(plugin.name))
			.map((plugin) => /** @satisfies {Plugin} */ ({ ...plugin, apply: not_preview })),
		...plugins
			.filter((plugin) => build_output_plugins.has(plugin.name))
			.map((plugin) => /** @satisfies {Plugin} */ ({ ...plugin, apply: 'build' })),
		/** @satisfies {Plugin} */ ({
			name: 'vite-plugin-sveltekit-adapter-cloudflare-workers',
			apply: 'build',
			configEnvironment: {
				order: 'post',
				handler(name, config) {
					if (name !== 'ssr') return;
					// Kit externalizes OpenTelemetry but the Worker is deployed without bundling
					config.resolve ??= {};
					config.resolve.external = [];
				}
			},
			// lets the other plugins read the resolved Vite config
			configResolved: cloudflare_config_plugin?.configResolved
		}),
		{
			name: 'vite-plugin-sveltekit-adapter-cloudflare-environment',
			apply: not_preview,
			async config(user_config, env) {
				const ssr = (await cloudflare_config_hook.call(this, user_config, env))?.environments?.ssr;

				if (ssr === undefined) {
					throw new Error(
						'Failed to get the SSR environment config from @cloudflare/vite-plugin. This should not happen.'
					);
				}

				return {
					environments: {
						ssr: {
							keepProcessEnv: ssr.keepProcessEnv,
							define: ssr.define,
							resolve: {
								noExternal: ssr.resolve?.noExternal,
								// `browser` would resolve `esm-env` to `BROWSER = true` and similar
								conditions: ssr.resolve?.conditions?.filter((condition) => condition !== 'browser'),
								// we resolve `cloudflare:workers` to a stub that runs in Node
								builtins: ssr.resolve?.builtins?.filter((id) => id !== 'cloudflare:workers')
							},
							optimizeDeps: {
								...ssr.optimizeDeps,
								// points to our stand-in `main`
								entries: undefined
							},
							build: {
								target: ssr.build?.target,
								rolldownOptions: {
									platform: ssr.build?.rolldownOptions?.platform,
									resolve: ssr.build?.rolldownOptions?.resolve
								}
							}
						}
					}
				};
			}
		}
	];
}
