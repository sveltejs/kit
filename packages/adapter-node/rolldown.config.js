/** @import { Plugin, RolldownOptions } from 'rolldown' */
import { builtinModules } from 'node:module';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

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

const dir_id = join(import.meta.dirname, 'src', 'dir.js');

/** @type {RolldownOptions} */
export default {
	input: {
		index: 'src/index.js',
		handler: 'src/handler.js',
		env: 'src/env.js'
	},
	output: {
		dir: 'files',
		format: 'esm',
		hoistTransitiveImports: false,
		chunkFileNames(chunk) {
			if (chunk.name === 'dir') return '[name].js';
			return 'chunks/[name].js';
		},
		codeSplitting: {
			groups: [
				{
					name: 'dir',
					test: dir_id
				}
			]
		}
	},
	plugins: [clearOutput('files'), prefixBuiltinModules()],
	// `MANIFEST` and `SERVER` are resolved at adapt time, and `@sveltejs/kit/node`
	// is kept external so that it gets bundled _alongside_ the app's server code
	// (rather than duplicated), see https://github.com/sveltejs/kit/issues/15755
	external: ['MANIFEST', 'SERVER', '@sveltejs/kit/node'],
	platform: 'node'
};
