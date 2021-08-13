import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
	{
		input: 'index.js',
		output: {
			file: 'index.cjs',
			format: 'cjs',
			sourcemap: true,
			exports: 'named'
		},
		plugins: [nodeResolve(), commonjs()],
		external: [...require('module').builtinModules]
	}
];
