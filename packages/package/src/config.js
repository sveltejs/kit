import path from 'path';
import fs from 'fs';
import url from 'url';

/**
 * Loads and validates svelte.config.js
 * @param {{ cwd?: string }} options
 * @returns {Promise<import('./types').Config>}
 */
export async function load_config({ cwd = process.cwd() } = {}) {
	const config_file = path.join(cwd, 'svelte.config.js');

	if (!fs.existsSync(config_file)) {
		return process_config({}, { cwd });
	}

	const config = await import(`${url.pathToFileURL(config_file).href}?ts=${Date.now()}`);

	// @ts-expect-error
	if (config.package) {
		throw new Error(
			`config.package is no longer supported. See https://github.com/sveltejs/kit/discussions/8825 for more information.`
		);
	}

	return config;

	return process_config(config.default, { cwd });
}

/**
 * @param {import('types').Config} config
 * @returns {import('./types').ValidatedConfig}
 */
function process_config(config, { cwd = process.cwd() } = {}) {
	return {
		extensions: config.extensions ?? ['.svelte'],
		kit: config.kit,
		preprocess: config.preprocess
	};
}
