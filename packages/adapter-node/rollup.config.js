import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
	input: 'src/server.js',
	output: {
		file: 'files/server.js',
		format: 'esm',
		sourcemap: true
	},
	plugins: [nodeResolve(), commonjs(), json()],
	external: ['./app.js', ...require('module').builtinModules]
};
