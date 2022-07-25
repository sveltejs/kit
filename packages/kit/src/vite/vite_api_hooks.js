import { lookup_vite_plugins_api_hooks, resolve_vite_plugins_api_hooks } from './utils.js';

/**
 * Notifies any Vite plugin with the `onKitConfig` api hook.
 * @param {import('types').ViteKitOptions} options
 * @param {import('types').ValidatedConfig} svelte_config
 * @param {import('vite').UserConfig} config
 * @param {import('vite').ConfigEnv} configEnv
 * @returns {Promise<void>}
 */
export async function call_vite_config_api_hooks(options, svelte_config, config, configEnv) {
	const plugins = (await resolve_vite_plugins_api_hooks(options, config)).filter(
		(p) => p && 'name' in p && typeof p.api.onKitConfig === 'function'
	);

	if (!plugins) return;

	await Promise.all(
		plugins.map(
			(p) =>
				p &&
				'name' in p &&
				typeof p.api.onKitConfig === 'function' &&
				p.api.onKitConfig(svelte_config, config, configEnv)
		)
	);
}

/**
 * Notifies any Vite plugin with the `onKitPrerendered` api hook.
 * @param {import('types').ViteKitOptions} options
 * @param {import('types').ValidatedConfig} svelte_config
 * @param {import('types').Prerendered} prerendered
 * @param {import('vite').ResolvedConfig} config
 * @returns {Promise<void>}
 */
export async function call_vite_prerendered_api_hooks(options, svelte_config, prerendered, config) {
	const plugins = lookup_vite_plugins_api_hooks(options, config).filter(
		(p) => typeof p.api.onKitPrerendered === 'function'
	);

	await execute_hooks(options, 'prerendered', plugins, (p) =>
		p.api?.onKitPrerendered?.(svelte_config, prerendered, config)
	);
}

/**
 * Notifies any Vite plugin with the `onKitAdapter` api hook.
 * @param {import('types').ViteKitOptions} options
 * @param {import('types').ValidatedConfig} svelte_config
 * @param {import('vite').ResolvedConfig} config
 * @returns {Promise<void>}
 */
export async function call_vite_adapter_api_hooks(options, svelte_config, config) {
	const plugins = lookup_vite_plugins_api_hooks(options, config).filter(
		(p) => typeof p.api.onKitAdapter === 'function'
	);

	await execute_hooks(options, 'adapter', plugins, (p) =>
		p.api?.onKitAdapter?.(svelte_config, config)
	);
}

/**
 * Resolves the execution of the hooks.
 * @param {import('types').ViteKitOptions} options
 * @param {import('types').KitPluginHookName} hook
 * @param {import('vite').Plugin[]} plugins
 * @return {import('types').KitPluginHooksExecutionResult}
 */
function resolve_hooks_execution(options, hook, plugins) {
	return plugins.length === 1
		? 'parallel'
		: typeof options.viteHooks?.runPrerendered === 'string'
		? options.viteHooks?.runPrerendered
		: typeof options.viteHooks?.runPrerendered === 'function'
		? options.viteHooks.runPrerendered(hook, plugins)
		: 'parallel';
}

/**
 * Runs the Vite's hooks.
 * @param {import('types').ViteKitOptions} options
 * @param {import('types').KitPluginHookName} hook
 * @param {import('vite').Plugin[]} plugins
 * @param {(plugin: import('vite').Plugin) => void | Promise<void>} callback
 * @return {Promise<void>}
 */
async function execute_hooks(options, hook, plugins, callback) {
	if (!plugins) return;

	const mode = resolve_hooks_execution(options, hook, plugins);

	if (mode === 'parallel') {
		await Promise.all(plugins.map((p) => callback(p)));
	} else if (mode === 'sequential') {
		for (let plugin of plugins) {
			await callback(plugin);
		}
	} else {
		const [control, newPlugins] = mode;
		if (control === 'parallel') {
			await Promise.all(newPlugins.map((p) => callback(p)));
		} else {
			for (let plugin of newPlugins) {
				await callback(plugin);
			}
		}
	}
}
