/** @import { Plugin } from 'vite' */
import { exactRegex } from '@rolldown/pluginutils';
import { worker_environment } from './config.js';
import { is_dev_or_build } from './utils.js';

/**
 * resolves cloudflare:workers to a stub outside workerd, such as where sveltekit analyses and
 * prerenders the build
 * @param {string} stub_import
 * @returns {Plugin}
 */
export function plugin_workers_stub(stub_import) {
	return {
		name: 'vite-plugin-sveltekit-adapter-cloudflare-virtual-workers-module',
		apply: is_dev_or_build,
		applyToEnvironment(environment) {
			// the worker imports the real cloudflare:workers module in workerd
			return environment.name !== worker_environment;
		},
		resolveId: {
			filter: { id: exactRegex('cloudflare:workers') },
			handler() {
				return {
					id: stub_import,
					external: true
				};
			}
		}
	};
}
