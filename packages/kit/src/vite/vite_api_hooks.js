import { lookup_vite_plugins, resolve_vite_plugins } from './utils.js';

/**
 * @param {import('vite').UserConfig} config
 * @param {import('types').ViteKitOptions} options
 * @param {import('types').ValidatedConfig} svelte_config
 * @returns {Promise<void>}
 */
export async function call_vite_config_api(config, options, svelte_config) {
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
				p.api.onKitConfig(svelte_config)
		)
	);
}

/**
 * @param {import('vite').ResolvedConfig} config
 * @param {import('types').ViteKitOptions} options
 * @param {import('types').Prerendered} prerendered
 * @returns {Promise<void>}
 */
export async function call_vite_prerendered_api(config, options, prerendered) {
	const plugins = lookup_vite_plugins(options, config).filter(
		(p) => typeof p.api.onKitPrerendered === 'function'
	);

	if (!plugins) return;

	await Promise.all(plugins.map((p) => p.api.onKitPrerendered(prerendered)));
}

/**
 * @param {import('vite').ResolvedConfig} config
 * @param {import('types').ViteKitOptions} options
 * @returns {Promise<void>}
 */
export async function call_vite_adapter_api(config, options) {
	const plugins = lookup_vite_plugins(options, config).filter(
		(p) => typeof p.api.onKitAdapter === 'function'
	);

	if (!plugins) return;

	await Promise.all(plugins.map((p) => p.api.onKitAdapter()));
}

// export function create_vite_hooks_api() {

/*
 * @type {{
 *   config: import('types').KitConfigHook[],
 *   prerendered: import('types').PrerenderedHook[]
 * }}
 */
// const vite_hooks = {
// 	config: [],
// 	prerendered: []
// };
/*
 * @param {import('types').ValidatedConfig} svelte_config
 * @return {Promise<void>}
 */
// async function call_config_hooks(svelte_config) {
// 	await Promise.all(vite_hooks.config.map((h) => h?.(svelte_config)));
// }
/*
 * @param {import('types').Prerendered} prerendered
 * @return {Promise<void>}
 */
// async function call_prerendered_hooks(prerendered) {
// 	await Promise.all(vite_hooks.prerendered.map((h) => h?.(prerendered)));
// }
/*
 * @type {{
 *   call_config_hooks: Promise<void>,
 *   call_prerendered_hooks: Promise<void>,
 *   api: import('types').VitePluginApi
 * }}
 */
// return {
// 	call_config_hooks,
// 	call_prerendered_hooks,
/* @type import('in').VitePluginApi */
// api: {
/*
 * @param {import('types').KitConfigHook} hook
 * @return {void}
 */
// onConfig(hook) {
// 	vite_hooks.config.push(hook);
// },
/*
 * @param {import('types').PrerenderedHook} hook
 * @return {void}
 */
// 		onPrerendered(hook) {
// 			vite_hooks.prerendered.push(hook);
// 		}
// 	}
// };
// }
