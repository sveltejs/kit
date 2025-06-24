import { nodeResolve } from '@rollup/plugin-node-resolve';

/** @type {import('rollup').RollupOptions} */
const config = {
	input: {
		edge: 'src/edge.js'
	},
	output: {
		dir: 'files',
		format: 'esm'
	},
	plugins: [nodeResolve({ preferBuiltins: true })],
	external: (id) => id === 'SERVER' || id === 'MANIFEST',
	preserveEntrySignatures: 'exports-only'
};

export default config;