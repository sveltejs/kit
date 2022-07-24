import { lookup_vite_plugins, resolve_vite_plugins } from './utils.js';

/**
 * Notifies any Vite plugin with the `onKitConfig` api hook.
 * @param {import('types').ViteKitOptions} options
 * @param {import('types').ValidatedConfig} svelte_config
 * @param {import('vite').UserConfig} config
 * @param {import('vite').ConfigEnv} configEnv
 * @returns {Promise<void>}
 */
export async function call_vite_config_api(options, svelte_config, config, configEnv) {
	const plugins = (await resolve_vite_plugins(options, config)).filter(
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
export async function call_vite_prerendered_api(options, svelte_config, prerendered, config) {
	const plugins = lookup_vite_plugins(options, config).filter(
		(p) => typeof p.api.onKitPrerendered === 'function'
	);

	if (!plugins) return;

	await Promise.all(plugins.map((p) => p.api.onKitPrerendered(svelte_config, prerendered, config)));
}

/**
 * Notifies any Vite plugin with the `onKitAdapter` api hook.
 * @param {import('types').ViteKitOptions} options
 * @param {import('types').ValidatedConfig} svelte_config
 * @param {import('vite').ResolvedConfig} config
 * @returns {Promise<void>}
 */
export async function call_vite_adapter_api(options, svelte_config, config) {
	const plugins = lookup_vite_plugins(options, config).filter(
		(p) => typeof p.api.onKitAdapter === 'function'
	);

	if (!plugins) return;

	await Promise.all(plugins.map((p) => p.api.onKitAdapter(svelte_config, config)));
}
