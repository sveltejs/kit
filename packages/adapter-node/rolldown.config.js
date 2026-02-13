import { builtinModules } from 'node:module';
import { rmSync } from 'node:fs';

/**
 * @param {string} filepath
 * @returns {import('rolldown').Plugin}
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
 * @returns {import('rolldown').Plugin}
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
		plugins: [clearOutput('files/index.js'), prefixBuiltinModules()],
		external: ['ENV', 'HANDLER'],
		platform: 'node'
	},
	{
		input: 'src/env.js',
		output: {
			file: 'files/env.js',
			format: 'esm'
		},
		plugins: [clearOutput('files/env.js'), prefixBuiltinModules()],
		external: ['HANDLER'],
		platform: 'node'
	},
	{
		input: 'src/handler.js',
		output: {
			file: 'files/handler.js',
			format: 'esm',
			codeSplitting: false
		},
		plugins: [clearOutput('files/handler.js'), prefixBuiltinModules()],
		external: ['ENV', 'MANIFEST', 'SERVER', 'SHIMS'],
		platform: 'node'
	},
	{
		input: 'src/shims.js',
		output: {
			file: 'files/shims.js',
			format: 'esm'
		},
		plugins: [clearOutput('files/shims.js'), prefixBuiltinModules()],
		platform: 'node'
	}
];
