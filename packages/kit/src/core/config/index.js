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
	if (typeof option !== 'object' || Array.isArray(option)) {
		throw new Error(`${keypath} should be an object`);
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
		const node = definition[key];
		const value = option[key];

		const path = `${keypath}.${key}`;

		if (node.type === 'branch') {
			merged[key] = validate(node.children, value || {}, path);
		} else {
			merged[key] = key in option ? node.validate(value, path) : node.fallback;
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
	if (typeof config === 'undefined') {
		throw new Error(
			'Your config is missing default exports. Make sure to include "export default config;"'
		);
	} else if (typeof config !== 'object') {
		throw new Error(
			`Unexpected config type "${typeof config}", make sure your default export is an object.`
		);
	}

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
 * Merges b into a, recursively, mutating a.
 * @param {Record<string, any>} a
 * @param {Record<string, any>} b
 * @param {string[]} conflicts array to accumulate conflicts in
 * @param {string[]} path array of property names representing the current
 *     location in the tree
 */
function merge_into(a, b, conflicts = [], path = []) {
	/**
	 * Checks for "plain old Javascript object", typically made as an object
	 * literal. Excludes Arrays and built-in types like Buffer.
	 * @param {any} x
	 */
	const is_plain_object = (x) => typeof x === 'object' && x.constructor === Object;

	for (const prop in b) {
		// normalize alias objects to array
		if (prop === 'alias' && path[path.length - 1] === 'resolve') {
			if (a[prop]) a[prop] = normalize_alias(a[prop]);
			if (b[prop]) b[prop] = normalize_alias(b[prop]);
		}

		if (is_plain_object(b[prop])) {
			if (!is_plain_object(a[prop])) {
				if (a[prop] !== undefined) {
					conflicts.push([...path, prop].join('.'));
				}
				a[prop] = {};
			}
			merge_into(a[prop], b[prop], conflicts, [...path, prop]);
		} else if (Array.isArray(b[prop])) {
			if (!Array.isArray(a[prop])) {
				if (a[prop] !== undefined) {
					conflicts.push([...path, prop].join('.'));
				}
				a[prop] = [];
			}
			a[prop].push(...b[prop]);
		} else {
			// Since we're inside a for/in loop which loops over enumerable
			// properties only, we want parity here and to check if 'a' has
			// enumerable-only property 'prop'. Using 'hasOwnProperty' to
			// exclude inherited properties is close enough. It is possible
			// that someone uses Object.defineProperty to create a direct,
			// non-enumerable property but let's not worry about that.
			if (Object.prototype.hasOwnProperty.call(a, prop)) {
				conflicts.push([...path, prop].join('.'));
			}
			a[prop] = b[prop];
		}
	}
}

/**
 * Takes zero or more objects and returns a new object that has all the values
 * deeply merged together. None of the original objects will be mutated at any
 * level, and the returned object will have no references to the original
 * objects at any depth. If there's a conflict the last one wins, except for
 * arrays which will be combined.
 * @param {...Object} objects
 * @returns {[Record<string, any>, string[]]} a 2-tuple with the merged object,
 *     and a list of merge conflicts if there were any, in dotted notation
 */
export function deep_merge(...objects) {
	const result = {};
	/** @type {string[]} */
	const conflicts = [];
	objects.forEach((o) => merge_into(result, o, conflicts));
	return [result, conflicts];
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

/**
 * normalize kit.vite.resolve.alias as an array
 * @param {import('vite').AliasOptions} o
 * @returns {import('vite').Alias[]}
 */
export function normalize_alias(o) {
	return Array.isArray(o)
		? o
		: Object.entries(o).map(([find, replacement]) => ({
				find,
				replacement
		  }));
}
