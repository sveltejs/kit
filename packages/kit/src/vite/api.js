export function create_vite_hooks_api() {
	/**
	 * @type {{
	 *   config: import('types').KitConfigHook[],
	 *   prerendered: import('types').PrerenderedHook[]
	 * }}
	 */
	const vite_hooks = {
		config: [],
		prerendered: []
	};

	/**
	 * @param {import('types').ValidatedConfig} svelte_config
	 * @return {Promise<void>}
	 */
	async function call_config_hooks(svelte_config) {
		await Promise.all(vite_hooks.config.map((h) => h?.(svelte_config)));
	}

	/**
	 * @param {import('types').Prerendered} prerendered
	 * @return {Promise<void>}
	 */
	async function call_prerendered_hooks(prerendered) {
		await Promise.all(vite_hooks.prerendered.map((h) => h?.(prerendered)));
	}

	/**
	 * @type {{
	 *   call_config_hooks: Promise<void>,
	 *   call_prerendered_hooks: Promise<void>,
	 *   api: import('types').VitePluginApi
	 * }}
	 */
	return {
		call_config_hooks,
		call_prerendered_hooks,
		/* @type import('in').VitePluginApi */
		api: {
			/**
			 * @param {import('types').KitConfigHook} hook
			 * @return {void}
			 */
			onConfig(hook) {
				vite_hooks.config.push(hook);
			},
			/**
			 * @param {import('types').PrerenderedHook} hook
			 * @return {void}
			 */
			onPrerendered(hook) {
				vite_hooks.prerendered.push(hook);
			}
		}
	};
}
