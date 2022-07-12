import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default [
	{
		input: {
			index: 'src/index.js',
			handler: 'src/handler.js',
			shims: 'src/shims.js'
		},
		output: {
			dir: 'files',
			format: 'esm'
		},
		plugins: [nodeResolve(), commonjs(), json()],
		external: ['SERVER', 'MANIFEST', ...require('module').builtinModules]
	}
];
