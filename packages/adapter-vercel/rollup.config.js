import { nodeResolve } from '@rollup/plugin-node-resolve';

/** @type {import('rollup').RollupOptions} */
const config = {
	input: {
		reroute: 'src/edge/reroute.js'
	},
	output: {
		dir: 'files/edge',
		format: 'esm'
	},
	plugins: [nodeResolve({ preferBuiltins: true })],
	external: (id) => id === '__HOOKS__',
	preserveEntrySignatures: 'exports-only'
};

export default config;
