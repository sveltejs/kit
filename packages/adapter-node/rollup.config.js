import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { builtinModules } from 'node:module';
import { rmSync } from 'node:fs';

/**
 * @param {string} filepath
 * @returns {import('rollup').Plugin}
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
 * @returns {import('rollup').Plugin}
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
		handler: 'src/handler.js',
		shims: 'src/shims.js'
	},
	output: {
		dir: 'files',
		format: 'esm',
		hoistTransitiveImports: false,
		chunkFileNames: 'chunks/[hash].js'
	},
	plugins: [
		clearOutput('files'),
		nodeResolve({ preferBuiltins: true }),
		commonjs(),
		json(),
		prefixBuiltinModules()
	],
	external: ['MANIFEST', 'SERVER', '@sveltejs/kit/node', '@sveltejs/kit/node/polyfills']
};
