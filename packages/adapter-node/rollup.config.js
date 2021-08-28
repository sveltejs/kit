import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default [
	{
		input: 'src/middlewares.js',
		output: {
			file: 'files/middlewares.js',
			format: 'esm',
			sourcemap: true
		},
		plugins: [nodeResolve(), commonjs(), json()],
		external: ['../output/server/app.js', ...require('module').builtinModules]
	},
	{
		input: 'src/index.js',
		output: {
			file: 'files/index.js',
			format: 'esm',
			sourcemap: true
		},
		plugins: [nodeResolve(), commonjs(), json()],
		external: ['./middlewares.js', './env.js', ...require('module').builtinModules]
	},
	{
		input: 'src/shims.js',
		output: {
			file: 'files/shims.js',
			format: 'esm'
		},
		external: ['module']
	}
];
