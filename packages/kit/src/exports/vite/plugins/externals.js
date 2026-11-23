/** @import { Plugin } from 'vite' */
import { createIdResolver } from 'vite';

/**
 * Bundles a dependency that Vite would externalize when the server output
 * would load a different copy of it than the module that imports it
 * @returns {Plugin}
 */
export function plugin_externals() {
	/** @type {ReturnType<typeof createIdResolver>} */
	let resolve_import;

	/** @type {ReturnType<typeof createIdResolver>} */
	let resolve_require;

	return {
		name: 'vite-plugin-sveltekit-externals',
		enforce: 'pre',
		apply: 'build',

		applyToEnvironment(environment) {
			return environment.config.consumer === 'server';
		},

		configResolved(config) {
			resolve_import = createIdResolver(config, { noExternal: true });
			resolve_require = createIdResolver(config, { noExternal: true, isRequire: true });
		},

		resolveId: {
			filter: { id: /^[\w@][^:]*$/ },
			async handler(id, importer, options) {
				const resolved = await this.resolve(id, importer, { ...options, skipSelf: true });
				if (!resolved?.external) return resolved;

				const resolve = options.kind === 'require-call' ? resolve_require : resolve_import;

				// Vite externalizes based on what the project root resolves, whatever the importer
				const [from_importer, from_root] = await Promise.all([
					resolve(this.environment, id, importer),
					resolve(this.environment, id)
				]);
				if (!from_importer || from_importer === from_root) return resolved;

				return this.resolve(from_importer, importer, { ...options, skipSelf: true });
			}
		}
	};
}
