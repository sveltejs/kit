import { builtinModules } from 'node:module';
import { rmSync } from 'node:fs';

/**
 * @param {string} filepath
 * @returns {import('rolldown').Plugin}
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
 * @returns {import('rolldown').Plugin}
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

export default {
	input: {
		index: 'src/index.js',
		env: 'src/env.js',
		handler: 'src/handler.js'
	},
	output: {
		dir: 'files',
		format: 'esm',
		hoistTransitiveImports: false,
		chunkFileNames: 'chunks/[hash].js'
	},
	plugins: [clearOutput('files'), prefixBuiltinModules()],
	// `MANIFEST` and `SERVER` are resolved at adapt time, and `@sveltejs/kit/node`
	// is kept external so that it gets bundled _alongside_ the app's server code
	// (rather than duplicated), see https://github.com/sveltejs/kit/issues/15755
	external: ['MANIFEST', 'SERVER', '@sveltejs/kit/node'],
	platform: 'node'
};
