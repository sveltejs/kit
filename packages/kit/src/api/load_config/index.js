import relative from 'require-relative';
import { bold, yellow } from 'kleur/colors';
import options from './options';

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
		const has_children = expected.default && typeof expected.default === 'object' && !Array.isArray(expected.default);

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
			merged[key] = has_children
				? validate(expected.default, {}, child_keypath)
				: expected.default;
		}
	}

	return merged;
}

const expected = new Set(['compilerOptions', 'kit', 'preprocess']);

export function load_config({ cwd = process.cwd() } = {}) {
	const config = relative('./svelte.config.js', cwd);
	return validate_config(config);
}

export function validate_config(config) {
	for (const key in config) {
		if (!expected.has(key)) {
			warn(`Unexpected option ${key}${key in options ? ` (did you mean kit.${key}?)` : ''}`);
		}
	}

	const { kit = {} } = config;

	return validate(options, kit, 'kit');
}
