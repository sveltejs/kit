import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { builtinModules } from 'node:module';

export default [
	{
		input: 'src/index.js',
		output: {
			file: 'files/index.js',
			format: 'esm'
		},
		plugins: [prefix_node_builtins(), nodeResolve({ preferBuiltins: true }), commonjs(), json()],
		external: ['ENV', 'HANDLER', ...builtinModules]
	},
	{
		input: 'src/env.js',
		output: {
			file: 'files/env.js',
			format: 'esm'
		},
		plugins: [prefix_node_builtins(), nodeResolve({ preferBuiltins: true }), commonjs(), json()],
		external: ['HANDLER', ...builtinModules]
	},
	{
		input: 'src/handler.js',
		output: {
			file: 'files/handler.js',
			format: 'esm',
			inlineDynamicImports: true
		},
		plugins: [prefix_node_builtins(), nodeResolve({ preferBuiltins: true }), commonjs(), json()],
		external: ['ENV', 'MANIFEST', 'SERVER', 'SHIMS', ...builtinModules]
	},
	{
		input: 'src/shims.js',
		output: {
			file: 'files/shims.js',
			format: 'esm'
		},
		plugins: [prefix_node_builtins(), nodeResolve({ preferBuiltins: true }), commonjs()],
		external: builtinModules
	}
];

const node_builtin_regex = new RegExp(
	`(?:from|import)\\s*(['"])(${[...builtinModules].join('|')})(['"])`,
	'g'
);
const dynamic_import_regex = new RegExp(
	`import\\s*\\(\\s*(['"])(${[...builtinModules].join('|')})(['"])\\s*\\)`,
	'g'
);

/**
 * @returns {import('rollup').Plugin}
 */
function prefix_node_builtins() {
	return {
		name: 'prefix-node-builtins-in-bundle',
		generateBundle(options, bundle) {
			for (const file_name of Object.keys(bundle)) {
				const file = bundle[file_name];
				if (file.type === 'chunk') {
					/** @type {import('rollup').OutputChunk} */
					const chunk = file;
					chunk.code = chunk.code
						.replace(
							node_builtin_regex,
							(match, quote, moduleName, endQuote) =>
								`${match.startsWith('from') ? 'from' : 'import'} ${quote}node:${moduleName}${endQuote}`
						)
						.replace(
							dynamic_import_regex,
							(match, quote, moduleName, endQuote) =>
								`import(${quote}node:${moduleName}${endQuote})`
						);
				}
			}
		}
	};
}
