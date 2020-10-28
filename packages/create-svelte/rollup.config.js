import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

export default {
	input: 'cli/index.ts',
	output: {
		file: 'bin',
		format: 'cjs',
		banner: '#!/usr/bin/env node',
		interop: false
	},
	plugins: [
		nodeResolve(),
		commonjs(),
		typescript(),
		{
			transform(code, id) {
				if (id.endsWith('.gitignore')) {
					return {
						code: `export default ${JSON.stringify(code)}`,
						map: null
					};
				}
			}
		}
	],
	external: require('module').builtinModules
};
