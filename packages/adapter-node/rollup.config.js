import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
// TODO: see if we can get rollup-plugin-typescript2 working to standardize on Rollup TypeScript plugin used
import typescript from '@rollup/plugin-typescript';

export default {
	input: 'src/index.ts',
	output: {
		file: 'server.js',
		format: 'cjs'
	},
	plugins: [
		nodeResolve(),
		commonjs(),
		typescript()
	],
	external: require('module').builtinModules
};