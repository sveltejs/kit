import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
	{
		input: 'src/index.js',
		output: {
			file: 'index.js',
			format: 'cjs'
		},
		plugins: [nodeResolve(), commonjs()],
		external: require('module').builtinModules
	},
	{
		input: 'src/render.js',
		output: {
			file: 'render.js',
			format: 'cjs'
		},
		plugins: [nodeResolve(), commonjs()],
		external: require('module').builtinModules
	}
];
