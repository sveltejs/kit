import { nodeResolve } from '@rollup/plugin-node-resolve';
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
		edge: 'src/edge.js'
	},
	output: {
		dir: 'files',
		format: 'esm'
	},
	plugins: [clearOutput('files'), nodeResolve({ preferBuiltins: true })],
	external: (id) => id === 'SERVER' || id === 'MANIFEST',
	preserveEntrySignatures: 'exports-only'
};

export default config;
