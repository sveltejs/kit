import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
	input: 'src/index.js',
	output: {
		file: 'files/index.js',
		format: 'cjs',
		sourcemap: true,
		exports: 'named'
	},
	plugins: [nodeResolve(), commonjs()],
	external: [...require('module').builtinModules, '@architect/shared/app.js']
};
