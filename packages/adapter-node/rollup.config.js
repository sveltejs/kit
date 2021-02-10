import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
	input: 'src/server.js',
	output: {
		file: 'files/server.js',
		format: 'esm',
		sourcemap: true
	},
	plugins: [nodeResolve(), commonjs()],
	external: require('module').builtinModules
};
