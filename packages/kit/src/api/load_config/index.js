import { bold, yellow } from 'kleur/colors';
import options from './options.js';
import * as url from 'url';
import { join } from 'path';

function warn(msg) {
	console.log(bold(yellow(msg)));
}

function validate(definition, option, keypath) {
	for (const key in option) {
		if (!(key in definition)) {
			throw new Error(`Unexpected option ${keypath}.${key}`);
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

const expected = new Set(['compilerOptions', 'kit', 'preprocess']);

export async function load_config({ cwd = process.cwd() } = {}) {
	const config_file = join(cwd, 'svelte.config.cjs');
	const config = await import(url.pathToFileURL(config_file));
	const validated = validate_config(config.default);

	// TODO check all the `files` exist when the config is loaded?
	// TODO check that `target` is present in the provided template

	return validated;
}

export function validate_config(config) {
	for (const key in config) {
		if (!expected.has(key)) {
			warn(`Unexpected option ${key}${key in options ? ` (did you mean kit.${key}?)` : ''}`);
		}
	}

	const { kit = {} } = config;

	const validated = validate(options, kit, 'kit');

	if (validated.appDir === '') {
		throw new Error('kit.appDir cannot be empty');
	}

	// resolve paths
	if (validated.paths.base !== '' && !validated.paths.base.startsWith('/')) {
		throw new Error('kit.paths.base must be a root-relative path');
	}

	validated.paths.assets = resolve(validated.paths.base, validated.paths.assets);

	return validated;
}
