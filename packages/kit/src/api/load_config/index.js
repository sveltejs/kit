import options from './options.js';
import * as url from 'url';
import { join } from 'path';

function validate(definition, option, keypath) {
	for (const key in option) {
		if (!(key in definition)) {
			let message = `Unexpected option ${keypath}.${key}`;

			if (keypath === 'config' && key in options.kit) {
				message += ` (did you mean config.kit.${key}?)`;
			} else if (keypath === 'config.kit' && key in options) {
				message += ` (did you mean config.${key}?)`;
			}

			throw new Error(message);
		}
	}

	const merged = {};

	for (const key in definition) {
		const expected = definition[key];
		const actual = option[key];

		const child_keypath = `${keypath}.${key}`;
		const has_children =
			expected.default && typeof expected.default === 'object' && !Array.isArray(expected.default);

		if (key in option) {
			if (has_children) {
				if (actual && (typeof actual !== 'object' || Array.isArray(actual))) {
					throw new Error(`${keypath}.${key} should be an object`);
				}

				merged[key] = validate(expected.default, actual, child_keypath);
			} else {
				merged[key] = expected.validate(actual, child_keypath);
			}
		} else {
			merged[key] = has_children ? validate(expected.default, {}, child_keypath) : expected.default;
		}
	}

	return merged;
}

function resolve(from, to) {
	// the `/.` is weird, but allows `${assets}/images/blah.jpg` to work
	// when `assets` is empty
	return remove_trailing_slash(url.resolve(add_trailing_slash(from), to)) || '/.';
}

function add_trailing_slash(str) {
	return str.endsWith('/') ? str : `${str}/`;
}

function remove_trailing_slash(str) {
	return str.endsWith('/') ? str.slice(0, -1) : str;
}

export async function load_config({ cwd = process.cwd() } = {}) {
	const config_file = join(cwd, 'svelte.config.cjs');
	const config = await import(url.pathToFileURL(config_file));
	const validated = validate_config(config.default);

	// TODO check all the `files` exist when the config is loaded?
	// TODO check that `target` is present in the provided template

	return validated;
}

export function validate_config(config) {
	const validated = validate(options, config, 'config');

	// resolve paths
	const { paths } = validated.kit;

	if (paths.base !== '' && !paths.base.startsWith('/')) {
		throw new Error('config.kit.paths.base must be a root-relative path');
	}

	paths.assets = resolve(paths.base, paths.assets);

	return validated;
}
