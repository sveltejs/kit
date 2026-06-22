/** @import { Plugin, RollupOptions } from 'rollup' */
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
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

/** @type {RollupOptions} */
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
		chunkFileNames: 'chunks/[hash].js',
		// prevent the handler code from becoming a shared chunk when both
		// handler.js and index.js are input entries
		manualChunks(id) {
			if (id.includes('node_modules')) return 'vendor';
		}
	},
	plugins: [
		clearOutput('files'),
		nodeResolve({ preferBuiltins: true }),
		// @ts-expect-error https://github.com/rollup/plugins/issues/1329
		commonjs(),
		// @ts-expect-error https://github.com/rollup/plugins/issues/1329
		json(),
		prefixBuiltinModules()
	],
	external: ['MANIFEST', 'SERVER', '@sveltejs/kit/node', '@sveltejs/kit/node/polyfills']
};
