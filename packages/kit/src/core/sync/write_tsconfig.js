import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';
import { styleText } from 'node:util';
import { posixify } from '../../utils/os.js';
import { read_package_imports, normalize_import_value } from '../../utils/imports.js';
import { write_if_changed } from './utils.js';

/**
 * Generates the tsconfig that the user's tsconfig inherits from.
 * @param {import('types').ValidatedKitConfig} kit
 * @param {string} root
 */
export function write_tsconfig(kit, root) {
	const paths = get_paths(kit, root);

	write_parent_tsconfig(
		root,
		root,
		'$app/tsconfig',
		{
			compilerOptions: {
				paths,
				rootDirs: ['.', `${kit.outDir}/types`],
				types: ['$app/types'],

				// This is required for svelte-package to work as expected
				// Can be overwritten
				lib: ['ESNext', 'DOM', 'DOM.Iterable'],

				...ESSENTIAL_OPTIONS,
				...RECOMMENDED_OPTIONS
			},
			exclude: [
				path.extname(kit.files.serviceWorker)
					? kit.files.serviceWorker
					: `${kit.files.serviceWorker}/**`
			]
		},
		{
			extends: '$app/tsconfig',
			include: ['src']
		}
	);

	write_parent_tsconfig(
		root,
		kit.files.serviceWorker,
		'$app/tsconfig/service-worker',
		{
			compilerOptions: {
				paths,
				types: ['$app/types'],
				lib: ['ESNext', 'WebWorker'],
				...ESSENTIAL_OPTIONS
			}
		},
		{
			extends: '$app/tsconfig/service-worker'
		}
	);
}

/** @type {Map<string, number>} */
const last_warned = new Map();

/**
 *
 * @param {string} root
 * @param {string} dir
 * @param {string} parent
 * @param {any} config
 * @param {any} example
 */
function write_parent_tsconfig(root, dir, parent, config, example) {
	const out_dir = path.join(root, `node_modules/${parent}`);
	const out_file = path.join(out_dir, 'tsconfig.json');

	const relative = (/** @type {string} */ file) => path.relative(out_dir, file);

	const paths =
		config.compilerOptions?.paths &&
		Object.fromEntries(
			Object.entries(config.compilerOptions?.paths).map(([k, v]) => [k, v.map(relative)])
		);

	const resolved = {
		compilerOptions: {
			...config.compilerOptions,
			paths,
			rootDirs: config.compilerOptions?.rootDirs?.map(relative)
		},
		include: config.include?.map(relative),
		exclude: config.exclude?.map(relative)
	};

	write_if_changed(out_file, JSON.stringify(resolved, null, '\t'));

	// now that we've written the parent config, we can resolve the
	// user config and validate that nothing important was overwritten
	validate_resolved_config(dir, parent, config, example);
}

/**
 * @param {string} dir
 * @param {string} parent
 * @param {any} config
 * @param {any} example
 */
function validate_resolved_config(dir, parent, config, example) {
	const user_config = load_user_tsconfig(dir);
	if (!user_config) return;

	const last_mtime = last_warned.get(user_config.file) ?? -1;
	const mtime = fs.statSync(user_config.file).mtimeMs;
	if (last_mtime >= mtime) return;
	last_warned.set(user_config.file, mtime);

	const { options } = user_config;
	const extend = Array.isArray(options.extends) ? options.extends : [options.extends];

	if (!extend.includes(parent)) {
		console.warn(
			styleText(
				['bold', 'yellow'],
				`${path.relative(process.cwd(), user_config.file)} should extend SvelteKit's built-in configuration:`
			)
		);

		console.warn(JSON.stringify(example, null, '  '));

		return;
	}

	const resolved = ts.parseJsonConfigFileContent(user_config.options, ts.sys, dir).options;
	const warnings = [];

	if (!resolved.types?.includes('$app/types')) {
		warnings.push('"types" was overwritten. It must include "$app/types"');
	}

	if (config.compilerOptions?.paths) {
		/** @type {Set<string>} */
		const mismatch = new Set();

		for (const [k, expected] of Object.entries(config.compilerOptions.paths)) {
			const actual = resolved.paths?.[k]?.map((x) =>
				path.resolve(/** @type {string} */ (resolved.pathsBasePath), x)
			);

			if (JSON.stringify(expected) !== JSON.stringify(actual)) {
				mismatch.add(remove_trailing_slashstar(k));
			}
		}

		if (mismatch.size > 0) {
			const joined = Array.from(mismatch)
				.map((v) => JSON.stringify(v))
				.join(', ')
				.replace(/, ([^,]*)$/, ' and $1');

			warnings.push(`"paths" was overwritten. Imports from ${joined} may not typecheck`);
		}
	}

	for (const key in ESSENTIAL_OPTIONS) {
		if (resolved[key] !== ESSENTIAL_OPTIONS[key]) {
			warnings.push(
				`"${key}" was overwritten. It should be ${JSON.stringify(ESSENTIAL_OPTIONS[key])}`
			);
		}
	}

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

/**
 * @param {string} file
 */
function remove_trailing_slashstar(file) {
	if (file.endsWith('/*')) {
		return file.slice(0, -2);
	} else {
		return file;
	}
}

/**
 * Without these, compilation will fail
 * @type {Record<string, any>}
 */
const ESSENTIAL_OPTIONS = {
	// svelte-preprocess cannot figure out whether you have a value or a type, so tell TypeScript
	// to enforce using \`import type\` instead of \`import\` for Types.
	// Also, TypeScript doesn't know about import usages in the template because it only sees the
	// script of a Svelte file. Therefore preserve all value imports.
	verbatimModuleSyntax: true,
	// Vite compiles modules one at a time
	isolatedModules: true
};

/**
 * Options that are strongly recommended, either because not having them is silly or
 * because the align TypeScript's behaviour with Vite's, but which can be overwritten
 * @type {Record<string, any>}
 */
const RECOMMENDED_OPTIONS = {
	allowJs: true,
	checkJs: true,
	forceConsistentCasingInFileNames: true,
	resolveJsonModule: true,
	moduleDetection: 'force',
	moduleResolution: 'bundler',
	allowImportingTsExtensions: true,
	module: 'esnext',
	target: 'esnext',
	skipLibCheck: true,
	esModuleInterop: true,
	noEmit: true // prevent tsconfig error "overwriting input files" - Vite handles the build and ignores this
};

/**
 * Generates the tsconfig that the user's tsconfig inherits from.
 * @param {string} out The file we're writing to
 * @param {import('types').ValidatedKitConfig} kit
 * @param {string} root The project root
 */
export function get_tsconfig(out, kit, root) {
	const dir = path.dirname(out);

	/** @param {string} file */
	const config_relative = (file) => posixify(path.relative(dir, file));

	const config = {
		compilerOptions: {
			paths: get_tsconfig_paths(kit, dir, root),
			rootDirs: [config_relative('.'), config_relative(`${kit.outDir}/types`)],
			types: ['$app/types'],

			// This is required for svelte-package to work as expected
			// Can be overwritten
			lib: ['ESNext', 'DOM', 'DOM.Iterable'],

			...ESSENTIAL_OPTIONS,
			...RECOMMENDED_OPTIONS
		},
		exclude: [
			config_relative(
				path.extname(kit.files.serviceWorker)
					? kit.files.serviceWorker
					: `${kit.files.serviceWorker}/**`
			)
		]
	};

	return kit.typescript.config(config) ?? config;
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

// <something><optional /*>
const alias_regex = /^(.+?)(\/\*)?$/;
// <path><optional /* or .fileending>
const value_regex = /^(.*?)((\/\*)|(\.\w+))?$/;

/**
 * Generates tsconfig path aliases from kit's aliases and the package.json `imports` field.
 * Related to vite alias creation.
 *
 * @param {import('types').ValidatedKitConfig} config
 * @param {string} root
 * @returns {Record<string, string[]>}
 */
function get_paths(config, root) {
	const alias = { ...config.alias };

	// Add all `#`-prefixed imports from package.json as path aliases
	const imports = read_package_imports(root);
	if (imports) {
		for (const [key, raw_value] of Object.entries(imports)) {
			if (!key.startsWith('#')) continue;
			const value = normalize_import_value(raw_value);
			if (value) {
				alias[key] = value;
			}
		}
	}

	/** @type {Record<string, string[]>} */
	const paths = {};

	for (const [key, value] of Object.entries(alias)) {
		const key_match = alias_regex.exec(key);
		if (!key_match) throw new Error(`Invalid alias key: ${key}`);

		const value_match = value_regex.exec(value);
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

/**
 * Generates tsconfig path aliases from kit's aliases and the package.json `imports` field.
 * Related to vite alias creation.
 *
 * @param {import('types').ValidatedKitConfig} config
 * @param {string} dir
 * @param {string} root
 */
function get_tsconfig_paths(config, dir, root) {
	/** @param {string} file */
	const config_relative = (file) => {
		let relative_path = path.relative(dir, file);
		if (!relative_path.startsWith('..')) {
			relative_path = './' + relative_path;
		}
		return posixify(relative_path);
	};

	const alias = { ...config.alias };

	// Add all `#`-prefixed imports from package.json as path aliases
	const imports = read_package_imports(root);
	if (imports) {
		for (const [key, raw_value] of Object.entries(imports)) {
			if (!key.startsWith('#')) continue;
			const value = normalize_import_value(raw_value);
			if (value) {
				alias[key] = value;
			}
		}
	}

	/** @type {Record<string, string[]>} */
	const paths = {};

	for (const [key, value] of Object.entries(alias)) {
		const key_match = alias_regex.exec(key);
		if (!key_match) throw new Error(`Invalid alias key: ${key}`);

		const value_match = value_regex.exec(value);
		if (!value_match) throw new Error(`Invalid alias value: ${value}`);

		const rel_path = config_relative(remove_trailing_slashstar(value));
		const slashstar = key_match[2];

		if (slashstar) {
			paths[key] = [rel_path + '/*'];
		} else {
			paths[key] = [rel_path];
			const fileending = value_match[4];

			if (!fileending && !(key + '/*' in alias)) {
				paths[key + '/*'] = [rel_path + '/*'];
			}
		}
	}

	return paths;
}
