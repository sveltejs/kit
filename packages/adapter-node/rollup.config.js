import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { builtinModules } from 'node:module';

function prefixBuiltinModules() {
	return {
		resolveId(source) {
			if (builtinModules.includes(source)) {
				return { id: 'node:' + source, external: true };
			}
		}
	};
}

export default [
	{
		input: 'src/index.js',
		output: {
			file: 'files/index.js',
			format: 'esm'
		},
		plugins: [nodeResolve({ preferBuiltins: true }), commonjs(), json(), prefixBuiltinModules()],
		external: ['ENV', 'HANDLER']
	},
	{
		input: 'src/env.js',
		output: {
			file: 'files/env.js',
			format: 'esm'
		},
		plugins: [nodeResolve(), commonjs(), json(), prefixBuiltinModules()],
		external: ['HANDLER']
	},
	{
		input: 'src/handler.js',
		output: {
			file: 'files/handler.js',
			format: 'esm',
			inlineDynamicImports: true
		},
		plugins: [nodeResolve(), commonjs(), json(), prefixBuiltinModules()],
		external: ['ENV', 'MANIFEST', 'SERVER', 'SHIMS']
	},
	{
		input: 'src/shims.js',
		output: {
			file: 'files/shims.js',
			format: 'esm'
		},
		plugins: [nodeResolve(), commonjs(), prefixBuiltinModules()]
	}
];
