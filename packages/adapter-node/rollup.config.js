import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { builtinModules } from 'node:module';
import { rmSync } from 'node:fs';

/**
 * @param {string} filepath
 * @returns {import('rollup').Plugin}
 */
function clearOutput(filepath) {
	return {
		name: 'clear-output',
		buildStart: {
			order: 'pre',
			sequential: true,
			handler() {
				rmSync(filepath, { recursive: true, force: true });
			}
		}
	};
}

/**
 * @returns {import('rollup').Plugin}
 */
function prefixBuiltinModules() {
	return {
		name: 'prefix-built-in-modules',
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
		plugins: [
			clearOutput('files/index.js'),
			nodeResolve({ preferBuiltins: true }),
			commonjs(),
			json(),
			prefixBuiltinModules()
		],
		external: ['ENV', 'HANDLER']
	},
	{
		input: 'src/env.js',
		output: {
			file: 'files/env.js',
			format: 'esm'
		},
		plugins: [
			clearOutput('files/env.js'),
			nodeResolve(),
			commonjs(),
			json(),
			prefixBuiltinModules()
		],
		external: ['HANDLER']
	},
	{
		input: 'src/handler.js',
		output: {
			file: 'files/handler.js',
			format: 'esm',
			inlineDynamicImports: true
		},
		plugins: [
			clearOutput('files/handler.js'),
			nodeResolve(),
			commonjs(),
			json(),
			prefixBuiltinModules()
		],
		external: ['ENV', 'MANIFEST', 'SERVER', 'SHIMS']
	},
	{
		input: 'src/shims.js',
		output: {
			file: 'files/shims.js',
			format: 'esm'
		},
		plugins: [clearOutput('files/shims.js'), nodeResolve(), commonjs(), prefixBuiltinModules()]
	}
];
