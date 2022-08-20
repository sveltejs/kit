import path from 'path';
import fs from 'fs';
import url from 'url';

/**
 * Loads and validates svelte.config.js
 * @param {{ cwd?: string }} options
 * @returns {Promise<import('./types').ValidatedConfig>}
 */
export async function load_config({ cwd = process.cwd() } = {}) {
	const config_file = path.join(cwd, 'svelte.config.js');

	if (!fs.existsSync(config_file)) {
		return process_config({}, { cwd });
	}

	const config = await import(`${url.pathToFileURL(config_file).href}?ts=${Date.now()}`);

	return process_config(config.default, { cwd });
}

/**
 * @param {import('types').Config} config
 * @returns {import('./types').ValidatedConfig}
 */
function process_config(config, { cwd = process.cwd() } = {}) {
	return {
		extensions: config.extensions ?? ['.svelte'],
		package: {
			source: path.resolve(cwd, config.kit?.files?.lib ?? config.package?.source ?? 'src/lib'),
			dir: config.package?.dir ?? 'package',
			exports: config.package?.exports ?? ((filepath) => !/^_|\/_|\.d\.ts$/.test(filepath)),
			files: config.package?.files ?? (() => true),
			emitTypes: config.package?.emitTypes ?? true
		},
		preprocess: config.preprocess
	};
}
