import fs from 'fs';
import path from 'path';
import * as url from 'url';
import { logger } from '../utils.js';
import options from './options.js';

/** @typedef {import('./types').ConfigDefinition} ConfigDefinition */

/**
 * @param {Record<string, ConfigDefinition>} definition
 * @param {any} option
 * @param {string} keypath
 * @returns {any}
 */
function validate(definition, option, keypath) {
	if (typeof option !== 'object') {
		if (typeof option === 'undefined') {
			throw new Error(
				'Your config is missing default exports. Make sure to include "export default config;"'
			);
		} else {
			throw new Error(
				`Unexpected config type "${typeof option}", make sure your default export is an object.`
			);
		}
	}

	// only validate nested key paths
	if (keypath !== 'config') {
		for (const key in option) {
			if (!(key in definition)) {
				let message = `Unexpected option ${keypath}.${key}`;

				if (keypath === 'config.kit' && key in options) {
					message += ` (did you mean config.${key}?)`;
				}

				throw new Error(message);
			}
		}
	}

	/** @type {Record<string, any>} */
	const merged = {};

	for (const key in definition) {
		const expected = definition[key];
		const actual = option[key];

		const child_keypath = `${keypath}.${key}`;

		if (key in option) {
			if (expected.type === 'branch') {
				if (actual && (typeof actual !== 'object' || Array.isArray(actual))) {
					throw new Error(`${keypath}.${key} should be an object`);
				}

				merged[key] = validate(expected.children, actual, child_keypath);
			} else {
				merged[key] = expected.validate(actual, child_keypath);
			}
		} else {
			merged[key] =
				expected.type === 'branch'
					? validate(expected.children, {}, child_keypath)
					: expected.default;
		}
	}

	return merged;
}

/**
 * @param {string} cwd
 * @param {import('types/config').ValidatedConfig} validated
 */
function validate_template(cwd, validated) {
	const { template } = validated.kit.files;
	const relative = path.relative(cwd, template);

	if (fs.existsSync(template)) {
		const contents = fs.readFileSync(template, 'utf8');
		const expected_tags = ['%svelte.head%', '%svelte.body%'];
		expected_tags.forEach((tag) => {
			if (contents.indexOf(tag) === -1) {
				throw new Error(`${relative} is missing ${tag}`);
			}
		});
	} else {
		throw new Error(`${relative} does not exist`);
	}
}

export async function load_config({ cwd = process.cwd() } = {}) {
	const config_file_esm = path.join(cwd, 'svelte.config.js');
	const config_file = fs.existsSync(config_file_esm)
		? config_file_esm
		: path.join(cwd, 'svelte.config.cjs');
	const config = await import(url.pathToFileURL(config_file).href);
	const validated = validate_config(config.default);

	validated.kit.files.assets = path.resolve(cwd, validated.kit.files.assets);
	validated.kit.files.hooks = path.resolve(cwd, validated.kit.files.hooks);
	validated.kit.files.lib = path.resolve(cwd, validated.kit.files.lib);
	validated.kit.files.routes = path.resolve(cwd, validated.kit.files.routes);
	validated.kit.files.serviceWorker = path.resolve(cwd, validated.kit.files.serviceWorker);
	validated.kit.files.template = path.resolve(cwd, validated.kit.files.template);

	validate_template(cwd, validated);

	// TODO check all the `files` exist when the config is loaded?

	return validated;
}

/**
 * @param {import('types/config').Config} config
 * @returns {import('types/config').ValidatedConfig}
 */
export function validate_config(config) {
	/** @type {import('types/config').ValidatedConfig} */
	const validated = validate(options, config, 'config');

	// resolve paths
	const { paths, appDir } = validated.kit;

	if (paths.base !== '' && (paths.base.endsWith('/') || !paths.base.startsWith('/'))) {
		throw new Error(
			"kit.paths.base option must be a root-relative path that starts but doesn't end with '/'. See https://kit.svelte.dev/docs#configuration-paths"
		);
	}

	if (paths.assets) {
		if (!/^[a-z]+:\/\//.test(paths.assets)) {
			throw new Error(
				'kit.paths.assets option must be an absolute path, if specified. See https://kit.svelte.dev/docs#configuration-paths'
			);
		}

		if (paths.assets.endsWith('/')) {
			throw new Error(
				"kit.paths.assets option must not end with '/'. See https://kit.svelte.dev/docs#configuration-paths"
			);
		}
	}

	if (appDir.startsWith('/') || appDir.endsWith('/')) {
		throw new Error(
			"kit.appDir cannot start or end with '/'. See https://kit.svelte.dev/docs#configuration"
		);
	}

	return validated;
}

/**
 * @param {string[]} conflicts - array of conflicts in dotted notation
 * @param {string=} pathPrefix - prepended in front of the path
 * @param {string=} scope - used to prefix the whole error message
 */
export function print_config_conflicts(conflicts, pathPrefix = '', scope) {
	const prefix = scope ? scope + ': ' : '';
	const log = logger({ verbose: false });
	conflicts.forEach((conflict) => {
		log.error(
			`${prefix}The value for ${pathPrefix}${conflict} specified in svelte.config.js has been ignored. This option is controlled by SvelteKit.`
		);
	});
}
