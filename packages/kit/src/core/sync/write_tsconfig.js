import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';
import { styleText } from 'node:util';
import { posixify } from '../../utils/os.js';
import { read_package_imports, normalize_import_value } from '../../utils/imports.js';
import { write_if_changed } from './utils.js';

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
 * Generates the tsconfig that the user's tsconfig inherits from.
 * @param {import('types').ValidatedKitConfig} kit
 * @param {string} root
 */
export function write_tsconfig(kit, root) {
	const user_config = load_user_tsconfig(root);
	if (user_config) validate_user_config(user_config);

	const main = path.join(root, 'node_modules/$app/tsconfig/tsconfig.json');
	const service_worker = path.join(root, 'node_modules/$app/tsconfig/service-worker/tsconfig.json');

	write_if_changed(main, JSON.stringify(get_tsconfig(main, kit, root), null, '\t'));

	write_if_changed(
		service_worker,
		JSON.stringify(get_tsconfig_serviceworker(service_worker, kit, root), null, '\t')
	);
}

/**
 * Without these, compilation will fail
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

/**
 * @param {string} out
 * @param {import('types').ValidatedKitConfig} kit
 * @param {string} root
 */
function get_tsconfig_serviceworker(out, kit, root) {
	return {
		compilerOptions: {
			paths: get_tsconfig_paths(kit, path.dirname(out), root),
			lib: ['ESNext', 'WebWorker'],
			types: ['$app/types'],

			...ESSENTIAL_OPTIONS,
			...RECOMMENDED_OPTIONS
		}
	};
}

/** @param {string} cwd */
function load_user_tsconfig(cwd) {
	const file = maybe_file(cwd, 'tsconfig.json') || maybe_file(cwd, 'jsconfig.json');
	if (!file) return;

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

	return {
		kind: path.basename(file),
		options: options.config
	};
}

/**
 * @param {{ kind: string, options: any }} config
 */
function validate_user_config({ kind, options }) {
	// we need to check that the user's tsconfig extends the framework config
	const extend = Array.isArray(options.extends) ? options.extends : [options.extends];

	if (extend.includes('$app/tsconfig')) {
		const { paths, baseUrl } = options.compilerOptions || {};

		// TODO: baseUrl will be removed in TypeScript 7.0
		if (baseUrl || paths) {
			console.warn(
				styleText(
					['bold', 'yellow'],
					`You have specified a baseUrl and/or paths in your ${kind} which interferes with SvelteKit's auto-generated tsconfig.json. ` +
						'Remove it to avoid problems with intellisense. For path aliases, use `config.alias` instead: https://svelte.dev/docs/kit/configuration#alias'
				)
			);
		}
	} else {
		console.warn(
			styleText(
				['bold', 'yellow'],
				`Your ${kind} should extend the configuration generated by SvelteKit:`
			)
		);
		console.warn(`{\n  "extends": "$app/tsconfig"\n}`);
	}
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
