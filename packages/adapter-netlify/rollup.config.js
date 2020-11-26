import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
	input: 'src/render.js',
	output: {
		file: 'files/render.js',
		format: 'cjs'
	},
	plugins: [nodeResolve(), commonjs()],
	external: require('module').builtinModules
};
