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

/** @type {import('rolldown').RolldownOptions} */
const config = {
	input: {
		serverless: 'src/serverless.js',
		shims: 'src/shims.js',
		edge: 'src/edge.js'
	},
	output: {
		dir: 'files',
		format: 'esm'
	},
	plugins: [clearOutput('files')],
	external: (id) => id === '0SERVER' || id === 'MANIFEST' || id.startsWith('node:'),
	preserveEntrySignatures: 'exports-only',
	platform: 'node'
};

export default config;
