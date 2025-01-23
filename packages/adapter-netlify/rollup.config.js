import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

/** @type {import('rollup').RollupOptions[]} */
const config = [
	{
		input: {
			serverless: 'src/serverless.js',
			shims: 'src/shims.js'
		},
		output: {
			dir: 'files/esm',
			format: 'esm'
		},
		// @ts-ignore https://github.com/rollup/plugins/issues/1329
		plugins: [nodeResolve({ preferBuiltins: true }), commonjs(), json()],
		external: (id) => id === '0SERVER' || id.startsWith('node:'),
		preserveEntrySignatures: 'exports-only'
	},
	{
		input: 'src/reroute.js',
		output: {
			file: 'files/reroute.js',
			format: 'esm'
		},
		plugins: [nodeResolve({ preferBuiltins: true })],
		external: (id) => id === '__HOOKS__',
		preserveEntrySignatures: 'exports-only'
	}
];

export default config;
