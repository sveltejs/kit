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
 * Validates that a tsconfig contains `"extends": "<id>"`
 * @param {any} options
 * @param {string} id
 */
export function extends_id(options, id) {
	const o = options.extends;
	return Array.isArray(o) ? o.includes(id) : o === id;
}

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
 * @param {any} resolved
 * @param {any} options
 */
export function validate_resolved_config(resolved, options) {
	const warnings = [];

	const join = (/** @type {string[]} */ array) =>
		array
			.map((v) => JSON.stringify(v))
			.join(', ')
			.replace(/, ([^,]*)$/, ' and $1');

	const missing_types = options.types?.filter(
		(/** @type {string} */ type) => !resolved.types?.includes(type)
	);

	if (missing_types.length > 0) {
		warnings.push(`"types" was overwritten. It must include ${join(missing_types)}`);
	}

	if (options.paths) {
		/** @type {Set<string>} */
		const mismatch = new Set();

		for (const [k, expected] of Object.entries(options.paths)) {
			const actual = resolved.paths?.[k]?.map((/** @type {string} */ x) =>
				path.resolve(/** @type {string} */ (resolved.pathsBasePath), x)
			);

			if (JSON.stringify(expected) !== JSON.stringify(actual)) {
				mismatch.add(remove_trailing_slashstar(k));
			}
		}

		if (mismatch.size > 0) {
			const joined = join([...mismatch]);

			warnings.push(`"paths" was overwritten. Imports from ${joined} may not typecheck`);
		}
	}

	for (const key in ESSENTIAL_OPTIONS) {
		if (resolved[key] !== options[key]) {
			warnings.push(`"${key}" was overwritten. It should be ${JSON.stringify(options[key])}`);
		}
	}

	return warnings;
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
