/** @import { ManifestData, ValidatedConfig } from 'types' */
/** @import { ViteDevServer } from 'vite' */

/**
 * @typedef {object} Context
 * @property {ValidatedConfig} svelte_config
 * @property {ViteDevServer} vite
 * @property {ManifestData} manifest_data
 * @property {Array<{ hash: string, file: string }>} remotes
 */

class DevContext {
	/** @type {Context} */
	context = import.meta.hot?.data ?? {};

	get svelte_config() {
		return this.context.svelte_config;
	}
	set svelte_config(config) {
		this.context.svelte_config = config;
	}

	get vite() {
		return this.context.vite;
	}
	set vite(vite) {
		this.context.vite = vite;
	}

	get manifest_data() {
		return this.context.manifest_data;
	}
	set manifest_data(manifest_data) {
		this.context.manifest_data = manifest_data;
	}

	get remotes() {
		return this.context.remotes;
	}
	set remotes(remotes) {
		this.context.remotes = remotes;
	}
}

export const dev = new DevContext();
