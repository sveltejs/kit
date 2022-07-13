import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

/** @type {import('rollup').RollupOptions} */
const config = {
	input: {
		serverless: 'src/serverless.js',
		shims: 'src/shims.js'
	},
	output: [
		{
			dir: 'files/cjs',
			format: 'cjs'
		},
		{
			dir: 'files/esm',
			format: 'esm'
		}
	],
	plugins: [nodeResolve(), commonjs(), json()],
	external: (id) => id === '0SERVER' || id.startsWith('node:'),
	preserveEntrySignatures: 'exports-only'
};

export default config;
