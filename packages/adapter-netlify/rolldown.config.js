import { rmSync } from 'node:fs';

const EXTERNAL = new Set(['0SERVER', 'MANIFEST']);

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
		serverless: 'src/serverless.js'
	},
	output: {
		dir: 'files',
		format: 'esm'
	},
	plugins: [clearOutput('files')],
	external: (id) => EXTERNAL.has(id) || id.startsWith('node:'),
	preserveEntrySignatures: 'exports-only',
	platform: 'node'
};

export default config;
