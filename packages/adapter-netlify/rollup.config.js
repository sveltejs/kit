import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
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

/** @type {import('rollup').RollupOptions} */
const config = {
	input: {
		serverless: 'src/serverless.js',
		shims: 'src/shims.js',
		edge: 'src/edge.js'
	},
	output: {
		dir: 'files',
		format: 'esm'
	},
	// @ts-ignore https://github.com/rollup/plugins/issues/1329
	plugins: [clearOutput('files'), nodeResolve({ preferBuiltins: true }), commonjs(), json()],
	external: (id) => id === '0SERVER' || id === 'MANIFEST' || id.startsWith('node:'),
	preserveEntrySignatures: 'exports-only'
};

export default config;
