/** @import { ValidatedConfig } from 'types' */
/** @import { ViteDevServer } from 'vite' */

/** @returns {Array<{ hash: string, file: string }>} */
export function get_remotes() {
	return import.meta.hot?.data.remotes;
}

/** @param {Array<{ hash: string, file: string }>} r */
export function set_remotes(r) {
	if (import.meta.hot) {
		import.meta.hot.data.remotes = r;
	}
}

/** @returns {ValidatedConfig} */
export function get_svelte_config() {
	return import.meta.hot?.data.svelte_config;
}

/** @param {ValidatedConfig} config */
export function set_svelte_config(config) {
	if (import.meta.hot) {
		import.meta.hot.data.svelte_config = config;
	}
}

/** @returns {ViteDevServer} */
export function get_dev_server() {
	return import.meta.hot?.data.dev_server;
}

/** @param {ViteDevServer} server */
export function set_dev_server(server) {
	if (import.meta.hot) {
		import.meta.hot.data.dev_server = server;
	}
}
