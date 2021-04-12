import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
	{
		input: 'src/entry.js',
		output: {
			file: 'files/entry.mjs',
			format: 'es',
			sourcemap: true
		},
		plugins: [nodeResolve(), commonjs()],
		external: [...require('module').builtinModules, './server/app.mjs']
	},
	{
		input: 'src/index.cjs',
		output: {
			file: 'files/index.js'
		},
		external: './entry.mjs'
	}
];
