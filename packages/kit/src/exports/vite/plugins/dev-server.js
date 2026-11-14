/** @import { EnvironmentModuleNode, Plugin, ViteDevServer } from 'vite' */
/** @import { ValidatedConfig } from 'types' */
import { prefixRegex } from '@rolldown/pluginutils';
import { DEV_INLINE_STYLES_ID, DEV_REPORT_ERROR_ID } from '../../../constants.js';
import { find_deps, get_inline_css_urls, report_load_error } from '../dev/generate_manifest.js';

const resolved_report_error_id = '\0' + DEV_REPORT_ERROR_ID;

const ids = [DEV_INLINE_STYLES_ID, DEV_REPORT_ERROR_ID];

/**
 * Gives a dev server that runs outside the Vite process, through `@sveltejs/kit/adapter/dev`,
 * what only the Vite process knows
 * @param {ValidatedConfig} svelte_config
 * @param {() => { vite: typeof import('vite'); root: string }} get_config
 * @returns {Plugin}
 */
export function plugin_dev_server(svelte_config, get_config) {
	/** @type {ViteDevServer} */
	let vite_dev_server;

	return {
		name: 'vite-plugin-sveltekit-dev-server',
		apply: 'serve',

		applyToEnvironment(environment) {
			// SvelteKit's own `ssr` environment runs in the Vite process and reads these directly
			return (
				!!svelte_config.adapter?.dev?.respond &&
				environment.config.consumer === 'server' &&
				environment.name !== 'ssr'
			);
		},

		configureServer(server) {
			vite_dev_server = server;
		},

		resolveId: {
			filter: { id: ids.map((id) => prefixRegex(id)) },
			handler(id) {
				return '\0' + id;
			}
		},

		load: {
			filter: { id: ids.map((id) => prefixRegex('\0' + id)) },
			async handler(id) {
				const { vite } = get_config();
				const environment = /** @type {import('vite').DevEnvironment} */ (this.environment);
				const { moduleGraph } = environment;

				if (id.startsWith(resolved_report_error_id)) {
					const error = new URLSearchParams(id.slice(id.indexOf('?'))).get('error');
					if (error) report_load_error(vite, vite_dev_server, JSON.parse(error));

					// so that the same error is reported each time it happens
					const self = moduleGraph.getModuleById(id);
					if (self) moduleGraph.invalidateModule(self);

					return 'export {};';
				}

				/** @type {Set<EnvironmentModuleNode>} */
				const deps = new Set();

				for (const file of new URLSearchParams(id.slice(id.indexOf('?'))).getAll('module')) {
					const node = moduleGraph.getModuleById(file);
					if (node) await find_deps(environment, node, deps);
				}

				// the answer depends on what has loaded so far, so it is only valid once. Vite does
				// not cache the result of a module that is invalidated while it loads
				const self = moduleGraph.getModuleById(id);
				if (self) moduleGraph.invalidateModule(self);

				const stylesheets = Array.from(get_inline_css_urls(vite, deps), ([url, inline]) => ({
					url,
					inline
				}));

				return `export default ${JSON.stringify(stylesheets)};`;
			}
		}
	};
}
