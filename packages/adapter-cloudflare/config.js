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

/**
 * Applies the Worker environment config that `@cloudflare/vite-plugin` generates
 * so that the server output suits workerd
 * @param {string | undefined} config_path
 * @returns {Plugin[]}
 */
export function plugin_config(config_path) {
	const plugins = cloudflare({
		configPath: config_path,
		viteEnvironment: { name: 'ssr' },
		config(config) {
			// the plugin requires `main` to exist but our Worker entrypoint is generated after the build
			config.main = fileURLToPath(new URL('./files/worker.js', import.meta.url));
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
		...plugins
			.filter((plugin) => useful_cloudflare_plugins.has(plugin.name))
			.map((plugin) => /** @satisfies {Plugin} */ ({ ...plugin, apply: 'build' })),
		{
			name: 'vite-plugin-sveltekit-adapter-cloudflare-environment',
			apply: 'build',
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
