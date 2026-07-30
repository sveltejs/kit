import { rmSync } from 'node:fs';

const EXTERNAL = new Set(['__HOOKS__']);

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
	platform: 'node',
	input: {
		reroute: 'src/reroute.js'
	},
	output: {
		file: 'files/reroute.js',
		format: 'esm',
		codeSplitting: false
	},
	plugins: [clearOutput('files/reroute.js')],
	external: (id) => EXTERNAL.has(id) || id.startsWith('node:'),
	preserveEntrySignatures: 'exports-only'
};

export default config;
