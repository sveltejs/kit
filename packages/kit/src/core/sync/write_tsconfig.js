import fs from 'node:fs';
import path from 'node:path';
import colors from 'kleur';
import { posixify } from '../../utils/filesystem.js';
import { write_if_changed } from './utils.js';
import { ts } from './ts.js';

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
function project_relative(file) {
	return posixify(path.relative('.', file));
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
 */
export function write_tsconfig(kit, cwd = process.cwd()) {
	const out = path.join(kit.outDir, 'tsconfig.json');

	const user_config = load_user_tsconfig(cwd);
	if (user_config) validate_user_config(kit, cwd, out, user_config);

	// only specify baseUrl if a) the user doesn't specify their own baseUrl
	// and b) they have non-relative paths. this causes problems with auto-imports,
	// so we print a suggestion that they use relative paths instead
	// TODO(v2): never include base URL, and skip the check below
	let include_base_url = false;

	if (user_config && !user_config.options.compilerOptions?.baseUrl) {
		const non_relative_paths = new Set();
		for (const paths of Object.values(user_config?.options.compilerOptions?.paths || {})) {
			for (const path of paths) {
				if (!path.startsWith('.')) non_relative_paths.add(path);
			}
		}

		if (non_relative_paths.size) {
			include_base_url = true;

			console.log(colors.bold().yellow('Please replace non-relative compilerOptions.paths:\n'));

			for (const path of non_relative_paths) {
				console.log(`  - "${path}" -> "./${path}"`);
			}

			console.log(
				'\nDoing so allows us to omit "baseUrl" — which causes problems with imports — from the generated tsconfig.json. See https://github.com/sveltejs/kit/pull/8437 for more information.'
			);
		}
	}

	write_if_changed(out, JSON.stringify(get_tsconfig(kit, include_base_url), null, '\t'));
}

/**
 * Generates the tsconfig that the user's tsconfig inherits from.
 * @param {import('types').ValidatedKitConfig} kit
 * @param {boolean} include_base_url
 */
export function get_tsconfig(kit, include_base_url) {
	/** @param {string} file */
	const config_relative = (file) => posixify(path.relative(kit.outDir, file));

	const include = ['ambient.d.ts', './types/**/$types.d.ts', config_relative('vite.config.ts')];
	for (const dir of [kit.files.routes, kit.files.lib]) {
		const relative = project_relative(path.dirname(dir));
		include.push(config_relative(`${relative}/**/*.js`));
		include.push(config_relative(`${relative}/**/*.ts`));
		include.push(config_relative(`${relative}/**/*.svelte`));
	}
	// Test folder is a special case - we advocate putting tests in a top-level test folder
	// and it's not configurable (should we make it?)
	const test_folder = project_relative('tests');
	include.push(config_relative(`${test_folder}/**/*.js`));
	include.push(config_relative(`${test_folder}/**/*.ts`));
	include.push(config_relative(`${test_folder}/**/*.svelte`));

	const exclude = [config_relative('node_modules/**'), './[!ambient.d.ts]**'];
	if (path.extname(kit.files.serviceWorker)) {
		exclude.push(config_relative(kit.files.serviceWorker));
	} else {
		exclude.push(config_relative(`${kit.files.serviceWorker}.js`));
		exclude.push(config_relative(`${kit.files.serviceWorker}.ts`));
		exclude.push(config_relative(`${kit.files.serviceWorker}.d.ts`));
	}

	const config = {
		compilerOptions: {
			// generated options
			baseUrl: include_base_url ? config_relative('.') : undefined,
			paths: get_tsconfig_paths(kit, include_base_url),
			rootDirs: [config_relative('.'), './types'],

			// essential options
			// svelte-preprocess cannot figure out whether you have a value or a type, so tell TypeScript
			// to enforce using \`import type\` instead of \`import\` for Types.
			importsNotUsedAsValues: 'error',
			// Vite compiles modules one at a time
			isolatedModules: true,
			// TypeScript doesn't know about import usages in the template because it only sees the
			// script of a Svelte file. Therefore preserve all value imports. Requires TS 4.5 or higher.
			preserveValueImports: true,

			// This is required for svelte-package to work as expected
			// Can be overwritten
			lib: ['esnext', 'DOM', 'DOM.Iterable'],
			moduleResolution: 'node',
			module: 'esnext',
			target: 'esnext',

			// TODO(v2): use the new flag verbatimModuleSyntax instead (requires support by Vite/Esbuild)
			ignoreDeprecations: ts && Number(ts.version.split('.')[0]) >= 5 ? '5.0' : undefined
		},
		include,
		exclude
	};

	return kit.typescript.config(config) ?? config;
}

/** @param {string} cwd */
function load_user_tsconfig(cwd) {
	const file = maybe_file(cwd, 'tsconfig.json') || maybe_file(cwd, 'jsconfig.json');

	if (!file) return;

	// we have to eval the file, since it's not parseable as JSON (contains comments)
	const json = fs.readFileSync(file, 'utf-8');

	return {
		kind: path.basename(file),
		options: (0, eval)(`(${json})`)
	};
}

/**
 * @param {import('types').ValidatedKitConfig} kit
 * @param {string} cwd
 * @param {string} out
 * @param {{ kind: string, options: any }} config
 */
function validate_user_config(kit, cwd, out, config) {
	// we need to check that the user's tsconfig extends the framework config
	const extend = config.options.extends;
	const extends_framework_config = extend && path.resolve(cwd, extend) === out;

	const options = config.options.compilerOptions || {};

	if (extends_framework_config) {
		const { paths: user_paths } = options;

		if (user_paths && fs.existsSync(kit.files.lib)) {
			/** @type {string[]} */
			const lib = user_paths['$lib'] || [];
			/** @type {string[]} */
			const lib_ = user_paths['$lib/*'] || [];

			// TODO(v2): check needs to be adjusted when we remove the base path
			const missing_lib_paths =
				!lib.some((relative) => path.resolve(cwd, relative) === kit.files.lib) ||
				!lib_.some((relative) => path.resolve(cwd, relative) === path.join(kit.files.lib, '/*'));

			if (missing_lib_paths) {
				console.warn(
					colors
						.bold()
						.yellow(`Your compilerOptions.paths in ${config.kind} should include the following:`)
				);
				let relative = posixify(path.relative('.', kit.files.lib));
				if (!relative.startsWith('.')) relative = `./${relative}`;
				console.warn(`{\n  "$lib":["${relative}"],\n  "$lib/*":["${relative}/*"]\n}`);
			}
		}
	} else {
		let relative = posixify(path.relative('.', out));
		if (!relative.startsWith('./')) relative = './' + relative;

		console.warn(
			colors
				.bold()
				.yellow(`Your ${config.kind} should extend the configuration generated by SvelteKit:`)
		);
		console.warn(`{\n  "extends": "${relative}"\n}`);
	}
}

// <something><optional /*>
const alias_regex = /^(.+?)(\/\*)?$/;
// <path><optional /* or .fileending>
const value_regex = /^(.*?)((\/\*)|(\.\w+))?$/;

/**
 * Generates tsconfig path aliases from kit's aliases.
 * Related to vite alias creation.
 *
 * @param {import('types').ValidatedKitConfig} config
 * @param {boolean} include_base_url
 */
function get_tsconfig_paths(config, include_base_url) {
	/** @param {string} file */
	const config_relative = (file) => posixify(path.relative(config.outDir, file));

	const alias = { ...config.alias };
	if (fs.existsSync(project_relative(config.files.lib))) {
		alias['$lib'] = project_relative(config.files.lib);
	}

	/** @type {Record<string, string[]>} */
	const paths = {};

	for (const [key, value] of Object.entries(alias)) {
		const key_match = alias_regex.exec(key);
		if (!key_match) throw new Error(`Invalid alias key: ${key}`);

		const value_match = value_regex.exec(value);
		if (!value_match) throw new Error(`Invalid alias value: ${value}`);

		const rel_path = (include_base_url ? project_relative : config_relative)(
			remove_trailing_slashstar(value)
		);
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
