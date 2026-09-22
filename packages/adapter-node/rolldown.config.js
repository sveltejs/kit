/** @import { Plugin, RolldownOptions } from 'rolldown' */
import { builtinModules } from 'node:module';
import { rmSync } from 'node:fs';

/**
 * @param {string} filepath
 * @returns {Plugin}
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
 * @returns {Plugin}
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

/** @type {RolldownOptions} */
export default {
	input: {
		index: 'src/index.js',
		handler: 'src/handler.js',
		'adapter-env': 'src/env.js'
	},
	output: {
		dir: 'files',
		format: 'esm',
		hoistTransitiveImports: false,
		chunkFileNames: 'chunks/[name].js'
	},
	plugins: [clearOutput('files'), prefixBuiltinModules()],
	// resolved by the app's build; `@sveltejs/kit/node` stays external so it isn't duplicated (#15755)
	external: ['#@sveltejs/adapter-node', '@sveltejs/kit/node'],
	platform: 'node'
};
