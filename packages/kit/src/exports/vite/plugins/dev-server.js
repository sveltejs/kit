/** @import { Plugin } from 'vite' */
/** @import { ValidatedConfig } from 'types' */
import { DEV_REPORT_ERROR_EVENT } from '../../../constants.js';
import { report_load_error } from '../dev/generate_manifest.js';

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

		configureServer(server) {
			if (!svelte_config.adapter?.dev?.respond) return;

			for (const environment of Object.values(server.environments)) {
				// the ssr environment runs in the vite process and reports errors itself
				if (environment.config.consumer !== 'server' || environment.name === 'ssr') continue;

				environment.hot.on(DEV_REPORT_ERROR_EVENT, (error) => {
					report_load_error(get_config().vite, server, error);
				});
			}
		}
	};
}
