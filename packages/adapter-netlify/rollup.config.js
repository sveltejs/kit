import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default [
	{
		input: {
			handler: 'src/handler.js',
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
		external: (id) => id === '0APP' || id.startsWith('node:'),
		preserveEntrySignatures: true
	}
];
