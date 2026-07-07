import { styleText } from 'node:util';
import { load_pkg_json } from './config.js';

/**
 * @param {import("./types.js").Options} options
 */
export function create_validator(options) {
	const { analyse_code, validate } = _create_validator(options);

	return {
		/**
		 * Checks a file content for problematic imports and things like `import.meta`
		 * @param {string} name
		 * @param {string} content
		 */
		analyse_code(name, content) {
			analyse_code(name, content);
		},
		validate() {
			/** @type {Record<string, any>} */
			const pkg = load_pkg_json(options.cwd);
			const warnings = validate(pkg);
			if (Object.keys(pkg).length === 0) {
				warnings.push(
					'No package.json found in the current directory. Please create one or run this command in a directory containing one.'
				);
			}

			// Just warnings, not errors, because
			// - would be annoying in watch mode (would have to restart the server)
			// - maybe there's a custom post-build script that fixes some of these
			if (warnings.length) {
				console.log(
					styleText(
						['bold', 'yellow'],
						'@sveltejs/package found the following issues while packaging your library:'
					)
				);
				for (const warning of warnings) {
					console.log(styleText('yellow', `${warning}\n`));
				}
			}
		}
	};
}
/**
 * @param {import("./types.js").Options} options
 */
export function _create_validator(options) {
	/** @type {Set<string>} */
	const imports = new Set();
	let uses_import_meta = false;
	let has_svelte_files = false;
	/** @type {Map<string, boolean>} */
	const unprotected_server_only_files = new Map();

	/**
	 * Checks a file content for problematic imports and things like `import.meta`
	 * @param {string} name
	 * @param {string} content
	 */
	function analyse_code(name, content) {
		has_svelte_files =
			has_svelte_files ||
			(options.config.extensions ?? ['.svelte']).some((ext) => name.endsWith(ext));
		uses_import_meta = uses_import_meta || content.includes('import.meta.env');

		const file_imports = [
			...content.matchAll(/from\s+('|")([^"';,]+?)\1/g),
			...content.matchAll(/import\s*\(\s*('|")([^"';,]+?)\1\s*\)/g),
			...content.matchAll(/import\s+('|")([^"';,]+?)\1/g)
		];
		let has_guard_import = false;
		for (const [, , import_path] of file_imports) {
			if (import_path.startsWith('$app/')) {
				imports.add(import_path);
			}
			if (import_path === '$app/server' || import_path === '$app/env/private') {
				has_guard_import = true;
			}
		}
		const is_server_only = name.includes('.server.') || /(^|\/)server\//.test(name);
		unprotected_server_only_files.set(name, is_server_only && !has_guard_import);
	}

	/**
	 * @param {Record<string, any>} pkg
	 */
	function validate(pkg) {
		/** @type {string[]} */
		const warnings = [];

		if (imports.has('$app/env') && [...imports].filter((i) => i.startsWith('$app/')).length === 1) {
			warnings.push(
				'Avoid usage of `$app/env` in your code, if you want the library to work for people not using SvelteKit (only regular Svelte, for example). ' +
					'Consider using packages like `esm-env` instead which provide cross-bundler-compatible environment variables.'
			);
		}

		if (uses_import_meta) {
			warnings.push(
				'Avoid usage of `import.meta.env` in your code. It only works in apps bundled with Vite. ' +
					'Consider using packages like `esm-env` instead which works with all bundlers or without bundling.'
			);
		}

		if (
			!(pkg.dependencies?.['@sveltejs/kit'] || pkg.peerDependencies?.['@sveltejs/kit']) &&
			([...imports].some((i) => i.startsWith('$app/')) || imports.has('@sveltejs/kit'))
		) {
			warnings.push(
				'You are using SvelteKit-specific imports in your code, but you have not declared a dependency on `@sveltejs/kit` in your `package.json`. ' +
					'Add it to your `dependencies` or `peerDependencies`.'
			);
		}

		if (
			!(pkg.dependencies?.svelte || pkg.peerDependencies?.svelte) &&
			(has_svelte_files ||
				[...imports].some((i) => i.startsWith('svelte/') || imports.has('svelte')))
		) {
			warnings.push(
				'You are using Svelte components or Svelte-specific imports in your code, but you have not declared a dependency on `svelte` in your `package.json`. ' +
					'Add it to your `dependencies` or `peerDependencies`.'
			);
		}

		if (pkg.exports) {
			const { conditions } = traverse_exports(pkg.exports);
			if (has_svelte_files && !pkg.svelte && !conditions.has('svelte')) {
				warnings.push(
					'You are using Svelte files, but did not declare a `svelte` condition in one of your `exports` in your `package.json`. ' +
						'Add a `svelte` condition to your `exports` to ensure that your package is recognized as Svelte package by tooling. ' +
						'See https://svelte.dev/docs/kit/packaging#anatomy-of-a-package-json-exports for more info'
				);
			}

			if (pkg.svelte) {
				const root_export = pkg.exports['.'];
				if (!root_export) {
					warnings.push(
						'You have a `svelte` field in your `package.json`, but no root export in your `exports`. Please align them so that bundlers will resolve consistently to the same file.'
					);
				} else {
					const { exports } = traverse_exports({ '.': root_export });
					if (![...exports].map(export_to_regex).some((_export) => _export.test(pkg.svelte))) {
						warnings.push(
							'The `svelte` field in your `package.json` does not match any export in your root `exports`. Please align them so that bundlers will resolve consistently to the same file.'
						);
						Object.keys(pkg.exports).map(export_to_regex);
					}
				}
			}
		} else {
			warnings.push(
				'No `exports` field found in `package.json`, please provide one. ' +
					'See https://svelte.dev/docs/kit/packaging#anatomy-of-a-package-json-exports for more info'
			);
		}

		const unprotected = [...unprotected_server_only_files]
			.filter(([, is_unprotected]) => is_unprotected)
			.map(([name]) => name);
		if (unprotected.length > 0) {
			const list = unprotected.map((name) => `- ${name}`).join('\n');
			warnings.push(
				`The following server-only files do not import \`$app/server\` or \`$app/env/private\`:\n${list}\n` +
					'These files will not be blocked from being imported on the client. ' +
					'If you intend to use this package within a SvelteKit application and want to prevent this, add `import "$app/server"` or an import from `$app/env/private` to each file — both throw when imported on the client.\n' +
					'These files were deemed server-only because they either contain `.server.` in their filename or are located in a `server` directory, which have special meaning within SvelteKit apps.'
			);
		}

		return warnings;
	}

	return {
		analyse_code,
		validate
	};
}

/**
 * @param {Record<string, any>} exports_map
 * @returns {{ exports: Set<string>; conditions: Set<string> }}
 */
function traverse_exports(exports_map) {
	/** @type {Set<string>} */
	const exports = new Set();
	/** @type {Set<string>} */
	const conditions = new Set();

	/**
	 * @param {Record<string, any>} exports_map
	 * @param {boolean} is_first_level
	 */
	function traverse(exports_map, is_first_level) {
		for (const key of Object.keys(exports_map ?? {})) {
			if (!is_first_level) {
				conditions.add(key);
			}

			const _export = exports_map[key];

			if (typeof _export === 'string') {
				exports.add(_export);
			} else {
				traverse(_export, false);
			}
		}
	}

	traverse(exports_map, true);

	return { exports, conditions };
}

/** @param {string} _export */
function export_to_regex(_export) {
	// $& means the whole matched string
	const regex_str = _export.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
	return new RegExp(`^${regex_str}$`);
}
