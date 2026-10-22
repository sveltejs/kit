/** @import { Plugin } from 'vite' */
import path from 'node:path';
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

const worker_entry = fileURLToPath(new URL('./files/worker.js', import.meta.url));

/**
 * Applies the Worker environment config that `@cloudflare/vite-plugin` generates
 * so that dev emulates workerd and the server output suits it
 * @param {string | undefined} config_path
 * @returns {Plugin[]}
 */
export function plugin_config(config_path) {
	const plugins = cloudflare({
		// the plugin resolves a relative path against Vite's root but Wrangler resolves
		// it against the working directory, which is what the rest of the adapter uses.
		// TODO: resolve the Wrangler config against Vite's root throughout the adapter
		configPath: config_path && path.resolve(config_path),
		viteEnvironment: { name: 'ssr' },
		config(config) {
			// the plugin requires `main` to be populated, so we set it to avoid it
			// trying to resolve build-generated entry in the user's wrangler config
			config.main = worker_entry;
		}
	});

	const cloudflare_config_hook = plugins.find(
		(plugin) => plugin.name === 'vite-plugin-cloudflare:config'
	)?.config;

	if (typeof cloudflare_config_hook !== 'function') {
		throw new Error(
			"Failed to find the vite-plugin-cloudflare:config plugin's config hook. This should not happen."
		);
	}

	return [
		...plugins.filter((plugin) => useful_cloudflare_plugins.has(plugin.name)),
		{
			name: 'vite-plugin-sveltekit-adapter-cloudflare-environment',
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
