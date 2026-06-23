/** @import { Plugin, RolldownOptions } from 'rolldown' */
import { builtinModules } from 'node:module';
import { rmSync } from 'node:fs';

/**
 * @param {string} filepath
 * @returns {Plugin}
 */
function clearOutput(filepath) {
	return {
		name: 'clear-output',
		buildStart: {
			order: 'pre',
			sequential: true,
			handler() {
				rmSync(filepath, { recursive: true, force: true });
			}
		}
	};
}

/**
 * @returns {Plugin}
 */
function prefixBuiltinModules() {
	return {
		name: 'prefix-built-in-modules',
		resolveId(source) {
			if (builtinModules.includes(source)) {
				return { id: 'node:' + source, external: true };
			}
		}
	};
}

/** @type {RolldownOptions} */
export default {
	input: {
		index: 'src/index.js',
		env: 'src/env.js',
		handler: 'src/handler.js',
		shims: 'src/shims.js',
		utils: 'utils.js'
	},
	output: {
		dir: 'files',
		format: 'esm',
		hoistTransitiveImports: false,
		chunkFileNames: 'chunks/[name].js',
		// prevent the handler code from becoming a shared chunk when both
		// handler.js and index.js are input entries
		manualChunks(id) {
			if (id.includes('node_modules')) return 'vendor';
		}
	},
	plugins: [clearOutput('files'), prefixBuiltinModules()],
	// `MANIFEST` and `SERVER` are resolved at adapt time, and `@sveltejs/kit/node`
	// is kept external so that it gets bundled _alongside_ the app's server code
	// (rather than duplicated), see https://github.com/sveltejs/kit/issues/15755
	external: ['MANIFEST', 'SERVER', '@sveltejs/kit/node'],
	platform: 'node'
};
