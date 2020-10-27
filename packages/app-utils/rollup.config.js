import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import pkg from './package.json';

export default {
	input: 'src/index.ts',
	output: [
		{
			file: pkg.main,
			format: 'cjs',
			sourcemap: true
		},
		{
			file: pkg.module,
			format: 'esm',
			sourcemap: true
		}
	],
	plugins: [
		nodeResolve(),
		typescript()
	],
	external: [
		...require('module').builtinModules,
		...Object.keys(pkg.dependencies)
	]
};