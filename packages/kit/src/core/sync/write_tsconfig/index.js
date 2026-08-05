/** @import { ValidatedKitConfig } from 'types' */
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';
import { write_if_changed } from '../utils.js';
import {
	ESSENTIAL_OPTIONS,
	get_subpath_imports,
	normalize_config,
	RECOMMENDED_OPTIONS,
	remove_trailing_slashstar
} from './utils.js';
import { extends_id, validate_resolved_config } from './validate.js';

/** @type {import('typescript')} */
let ts;
try {
	ts = await import('typescript');
} catch {
	// The user has not installed TypeScript.
}

/**
 * Generates the tsconfig that the user's tsconfig inherits from.
 * @param {import('types').ValidatedKitConfig} kit
 * @param {string} root
 */
export function write_tsconfig(kit, root) {
	const paths = get_paths(kit, root);
	const types = ['$app/types'];

	write_parent_tsconfig(
		root,
		'$app/tsconfig',
		{
			compilerOptions: {
				paths,
				rootDirs: ['.', `${kit.outDir}/types`],
				types,

				// This is required for svelte-package to work as expected
				// Can be overwritten
				lib: ['ESNext', 'DOM', 'DOM.Iterable'],

				...ESSENTIAL_OPTIONS,
				...RECOMMENDED_OPTIONS
			}
		},
		kit.typescript.config
	);

	validate_config(root, {
		paths,
		types,
		exclusions: [kit.files.serviceWorker],
		example: {
			extends: '$app/tsconfig'
		}
	});

	write_parent_tsconfig(root, '$app/tsconfig/service-worker', {
		compilerOptions: {
			paths,
			types,
			lib: ['ESNext', 'WebWorker'],
			...ESSENTIAL_OPTIONS,
			...RECOMMENDED_OPTIONS
		}
	});

	validate_config(kit.files.serviceWorker, {
		paths,
		types,
		example: {
			extends: '$app/tsconfig/service-worker'
		}
	});
}

/**
 * Write a generated `tsconfig.json` inside `node_modules`, for the
 * user config to extend
 * @param {string} root The project root
 * @param {string} id The id of the generated config
 * @param {any} config The contents of the generated tsconfig, with paths relative to `root`
 * @param {ValidatedKitConfig['typescript']['config']} [transform] TODO get rid of this
 */
function write_parent_tsconfig(root, id, config, transform) {
	// simplified tsconfig resolvers (e.g. Playwright's) only find `${id}.json`, not `${id}/tsconfig.json`
	const out_file = path.join(root, `node_modules/${id}.json`);

	let normalized = normalize_config(out_file, config);
	normalized = transform?.(normalized) ?? normalized;

	write_if_changed(out_file, JSON.stringify(normalized, null, '\t'));
}

/**
 * @param {string} dir The directory to resolve a user config from
 * @param {Object} options
 * @param {Record<string, string[]>} options.paths The expected paths
 * @param {string[]} options.types The expected types
 * @param {string[]} [options.exclusions] Files that should be excluded
 * @param {any} options.example What to print if the user config does _not_ extend the generated config
 */
function validate_config(dir, options) {
	if (!ts) {
		// The user has not installed TypeScript. Skip validation of config.
		return;
	}

	const user_config = load_user_tsconfig(dir);
	if (!user_config || !modified_since_last_check(user_config.file)) return;

	// now that we've written the parent config, we can resolve the
	// user config and validate that nothing important was overwritten
	if (!extends_id(user_config.options, options.example.extends)) {
		console.warn(
			styleText(
				['bold', 'yellow'],
				`${path.relative(process.cwd(), user_config.file)} should extend SvelteKit's built-in configuration:`
			)
		);

		console.warn(JSON.stringify(options.example, null, '  '));

		return;
	}

	const resolved = ts.parseJsonConfigFileContent(user_config.options, ts.sys, dir);

	const warnings = validate_resolved_config(
		dir,
		resolved,
		options.paths,
		options.types,
		options.exclusions
	);

	if (warnings.length > 0) {
		console.warn(
			styleText(
				['bold', 'yellow'],
				`Found issues while validating ${path.relative(process.cwd(), user_config.file)}`
			)
		);

		for (const warning of warnings) {
			console.warn(`  - ${warning}`);
		}
	}
}

/** @type {Map<string, number>} */
const mtimes = new Map();

/**
 * Returns true if the file was modified since we last got here,
 * otherwise we can skip warnings
 * @param {string} file
 */
function modified_since_last_check(file) {
	const a = mtimes.get(file) ?? -1;
	const b = fs.statSync(file).mtimeMs;
	mtimes.set(file, b);

	return b > a;
}

/**
 * @param {string} cwd
 * @param {string} file
 */
function maybe_file(cwd, file) {
	const resolved = path.resolve(cwd, file);
	if (fs.existsSync(resolved)) {
		return resolved;
	}
}

/** @param {string} cwd */
function load_user_tsconfig(cwd) {
	const file = maybe_file(cwd, 'tsconfig.json') || maybe_file(cwd, 'jsconfig.json');
	if (!file) return;

	const options = load_tsconfig(file);

	return {
		file,
		kind: path.basename(file),
		options
	};
}

/**
 * @param {string} file
 */
function load_tsconfig(file) {
	const options = ts.readConfigFile(file, ts.sys.readFile);

	if (options.error) {
		let message = `Failed to parse TypeScript config`;

		if (typeof options.error.messageText === 'string') {
			message += `: ${options.error.messageText}`;
		}

		const error = new Error(message);
		error.stack = '';

		if (options.error.file && options.error.start !== undefined) {
			const line_start = options.error.file.text.lastIndexOf('\n', options.error.start);

			const line =
				line_start === -1
					? 0
					: options.error.file.text.slice(0, options.error.start).split('\n').length;
			const column = options.error.start - line_start;

			error.stack = `${error.message}\n    at ${path.relative(process.cwd(), file)}:${line}:${column}`;
		}

		throw error;
	}

	return options.config;
}

/** Matches anything (except the empty string/string with newline), and separates any trailing `/*` */
const alias_key = /^(.+?)(\/\*)?$/;

/** Matches anything (except the empty string/string with newline), and separates any trailing `/*` or file extension */
const alias_value = /^(.+?)((\/\*)|(\.\w+))?$/;

/**
 * Generates tsconfig path aliases from kit's aliases and the package.json `imports` field.
 * Related to vite alias creation.
 *
 * @param {import('types').ValidatedKitConfig} config
 * @param {string} root
 * @returns {Record<string, string[]>}
 */
function get_paths(config, root) {
	const alias = {
		...config.alias,
		...get_subpath_imports(root)
	};

	/** @type {Record<string, string[]>} */
	const paths = {};

	for (const [key, value] of Object.entries(alias)) {
		const key_match = alias_key.exec(key);
		if (!key_match) throw new Error(`Invalid alias key: ${key}`);

		const value_match = alias_value.exec(value);
		if (!value_match) throw new Error(`Invalid alias value: ${value}`);

		const resolved = path.resolve(root, remove_trailing_slashstar(value));
		const slashstar = key_match[2];

		if (slashstar) {
			paths[key] = [resolved + '/*'];
		} else {
			paths[key] = [resolved];
			const fileending = value_match[4];

			if (!fileending && !(key + '/*' in alias)) {
				paths[key + '/*'] = [resolved + '/*'];
			}
		}
	}

	return paths;
}
