import path from 'node:path';
import { normalize_import_value, read_package_imports } from '../../../utils/imports.js';
import { posixify } from '../../../utils/os.js';

/**
 * Without these, compilation will fail
 * @type {Record<string, any>}
 */
export const ESSENTIAL_OPTIONS = {
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
export const RECOMMENDED_OPTIONS = {
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
 * Makes paths relative to the output file
 * @param {string} out
 * @param {any} config
 * @param {(input: any) => any} [transform] TODO get rid of this option
 */
export function normalize_config(out, config, transform) {
	const dir = path.dirname(out);
	const relative = (/** @type {string} */ file) => posixify(path.relative(dir, file));

	const paths =
		config.compilerOptions?.paths &&
		Object.fromEntries(
			Object.entries(config.compilerOptions?.paths).map(([k, v]) => [k, v.map(relative)])
		);

	const normalized = {
		...config,
		compilerOptions: {
			...config.compilerOptions,
			paths,
			rootDirs: config.compilerOptions?.rootDirs?.map(relative)
		},
		include: config.include?.map(relative),
		exclude: config.exclude?.map(relative)
	};

	return transform?.(normalized) ?? normalized;
}

/**
 * @param {string} file
 */
export function remove_trailing_slashstar(file) {
	if (file.endsWith('/*')) {
		return file.slice(0, -2);
	} else {
		return file;
	}
}

/**
 * @param {string} root
 */
export function get_subpath_imports(root) {
	// Add all `#`-prefixed imports from package.json as path aliases
	const imports = read_package_imports(root);

	/** @type {Record<string, string>} */
	const alias = {};

	if (imports) {
		for (const [key, raw_value] of Object.entries(imports)) {
			if (!key.startsWith('#')) continue;
			const value = normalize_import_value(raw_value);
			if (value) {
				alias[key] = value;
			}
		}
	}

	return alias;
}
