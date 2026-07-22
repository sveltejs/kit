/** @import { ValidatedConfig } from 'types' */
/** @import { ViteDevServer } from 'vite' */

/**
 * @typedef {object} Context
 * @property {ViteDevServer} dev_server
 * @property {Array<{ hash: string, file: string }>} remotes
 * @property {ValidatedConfig} svelte_config
 */

/** @type {Context} */
const context = import.meta.hot?.data;

/** @returns {ViteDevServer} */
export function get_dev_server() {
	return context.dev_server;
}

/** @param {ViteDevServer} server */
export function set_dev_server(server) {
	context.dev_server = server;
}

/** @returns {ValidatedConfig} */
export function get_svelte_config() {
	return context.svelte_config;
}

/** @param {ValidatedConfig} config */
export function set_svelte_config(config) {
	context.svelte_config = config;
}

/** @returns {Array<{ hash: string, file: string }>} */
export function get_remotes() {
	return context.remotes;
}

/** @param {Array<{ hash: string, file: string }>} r */
export function set_remotes(r) {
	context.remotes = r;
}
