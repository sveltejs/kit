/** @import { EnvironmentModuleNode, Plugin } from 'vite' */
/** @import { ValidatedConfig } from 'types' */
import { prefixRegex } from '@rolldown/pluginutils';
import { DEV_INLINE_STYLES_ID, DEV_REPORT_ERROR_EVENT } from '../../../constants.js';
import { find_deps, get_inline_css_urls, report_load_error } from '../dev/generate_manifest.js';

const ids = [DEV_INLINE_STYLES_ID];

/**
 * Gives a dev server that runs outside the Vite process, through `@sveltejs/kit/adapter/dev`,
 * what only the Vite process knows
 * @param {ValidatedConfig} svelte_config
 * @param {() => { vite: typeof import('vite'); root: string }} get_config
 * @returns {Plugin}
 */
export function plugin_dev_server(svelte_config, get_config) {
	return {
		name: 'vite-plugin-sveltekit-dev-server',
		apply: 'serve',

		applyToEnvironment(environment) {
			// the ssr environment runs in the vite process and reads these directly
			return (
				!!svelte_config.adapter?.dev?.respond &&
				environment.config.consumer === 'server' &&
				environment.name !== 'ssr'
			);
		},

		configureServer(server) {
			if (!svelte_config.adapter?.dev?.respond) return;

			for (const environment of Object.values(server.environments)) {
				// the ssr environment runs in the vite process and reports errors itself
				if (environment.config.consumer !== 'server' || environment.name === 'ssr') continue;

				environment.hot.on(DEV_REPORT_ERROR_EVENT, (error) => {
					report_load_error(get_config().vite, server, error);
				});
			}
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

				/** @type {Set<EnvironmentModuleNode>} */
				const deps = new Set();

				for (const file of new URLSearchParams(id.slice(id.indexOf('?'))).getAll('module')) {
					const node = moduleGraph.getModuleById(file);
					if (node) await find_deps(environment, node, deps);
				}

				// only valid once, since the answer depends on what has loaded so far
				// vite does not cache a module that is invalidated while it loads
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
