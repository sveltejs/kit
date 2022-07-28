import path from 'path';
import fs from 'fs';
import url from 'url';
import { boolean, fun, object, string, validate } from '@internal/shared/config/index.js';

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
	// SvelteKit-interop: Carry over some values if present
	if (!config.package) {
		config.package = {};
	}
	if (config.kit?.files?.lib && !config.package.source) {
		config.package.source = config.kit.files.lib;
	}

	const validated = validate_config(config);
	validated.package.source = path.resolve(cwd, validated.package.source);
	return validated;
}

/**
 * @param {import('types').Config} config
 * @returns {import('./types').ValidatedConfig}
 */
export function validate_config(config) {
	if (typeof config !== 'object') {
		throw new Error(
			'svelte.config.js must have a configuration object as its default export. See https://kit.svelte.dev/docs/configuration'
		);
	}

	return options(config, 'config');
}

/** @typedef {import('./types').Validator} Validator */

/** @type {Validator} */
const options = object(
	{
		extensions: validate(['.svelte'], (input, keypath) => {
			if (!Array.isArray(input) || !input.every((page) => typeof page === 'string')) {
				throw new Error(`${keypath} must be an array of strings`);
			}

			input.forEach((extension) => {
				if (extension[0] !== '.') {
					throw new Error(`Each member of ${keypath} must start with '.' — saw '${extension}'`);
				}

				if (!/^(\.[a-z0-9]+)+$/i.test(extension)) {
					throw new Error(`File extensions must be alphanumeric — saw '${extension}'`);
				}
			});

			return input;
		}),
		package: object({
			source: string('src/lib'),
			dir: string('package'),
			// excludes all .d.ts and filename starting with _
			exports: fun((filepath) => !/^_|\/_|\.d\.ts$/.test(filepath)),
			files: fun(() => true),
			emitTypes: boolean(true)
		})
	},
	true
);
