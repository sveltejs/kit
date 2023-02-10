import { existsSync, readFileSync } from 'node:fs';
import colors from 'kleur';

/**
 * @param {import("./types").Options} options
 */
export function create_validator(options) {
	/** @type {Set<string>} */
	const imports = new Set();
	let uses_import_meta = false;
	let has_svelte_files = false;

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
			...content.matchAll(/import\s*\(\s*('|")([^"';,]+?)\1\s*\)/g)
		];
		for (const [, , import_path] of file_imports) {
			if (import_path.startsWith('$app/')) {
				imports.add(import_path);
			}
		}
	}

	function validate() {
		// Everything below is just warnings, not errors, because
		// - would be annoying in watch mode (would have to restart the server)
		// - maybe there's a custom post-build script that fixes some of these

		/** @type {Record<string, any>} */
		const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

		if (
			imports.has('$app/environment') &&
			[...imports].filter((i) => i.startsWith('$app/')).length === 1
		) {
			warn(
				'Avoid usage of `$app/environment` in your code, if you want to library to work for people not using SvelteKit (only regular Svelte, for example). ' +
					'Consider using packages like `esm-env` instead which provide cross-bundler-compatible environment variables.'
			);
		}

		if (uses_import_meta) {
			warn(
				'Avoid usage of `import.meta.env` in your code. It requires a bundler to work. ' +
					'Consider using packages like `esm-env` instead which provide cross-bundler-compatible environment variables.'
			);
		}

		if (
			!(pkg.dependencies?.['@sveltejs/kit'] || pkg.peerDependencies?.['@sveltejs/kit']) &&
			([...imports].some((i) => i.startsWith('$app/')) || imports.has('@sveltejs/kit'))
		) {
			warn(
				'You are using SvelteKit-specific imports in your code, but you have not declared a dependency on `@sveltejs/kit` in your `package.json`. ' +
					'Add it to your `dependencies` or `peerDependencies`.'
			);
		}

		if (
			!(pkg.dependencies?.svelte || pkg.peerDependencies?.svelte) &&
			(has_svelte_files ||
				[...imports].some((i) => i.startsWith('svelte/') || imports.has('svelte')))
		) {
			warn(
				'You are using Svelte components or Svelte-specific imports in your code, but you have not declared a dependency on `svelte` in your `package.json`. ' +
					'Add it to your `dependencies` or `peerDependencies`.'
			);
		}

		const { not_found, conditions } = traverse_exports(pkg.exports);

		if (pkg.exports) {
			if (has_svelte_files && !pkg.svelte && !conditions.has('svelte')) {
				warn(
					'You are using Svelte files, but did not declare a `svelte` condition in one of your `exports` in your `package.json`. ' +
						'Add a `svelte` condition to your `exports` to ensure that your package is recognized as Svelte package by tooling. ' +
						'See https://kit.svelte.dev/docs/packaging#anatomy-of-a-package-json-exports for more info'
				);
			}
		} else {
			warn(
				'No `exports` field found in `package.json`, please provide one. ' +
					'See https://kit.svelte.dev/docs/packaging#anatomy-of-a-package-json-exports for more info'
			);
		}

		if (not_found.size) {
			let message = 'The following files are referenced in your `exports` but do not exist:';
			for (const [path, key] of not_found) {
				message += `\n  - ${path} (from export "${key}")`;
			}
			message +=
				'\n\nEnsure all files are properly built and copied across or adjust the exports. ' +
				'See https://kit.svelte.dev/docs/packaging#anatomy-of-a-package-json-exports for more info';
			warn(message);
		}
	}

	return {
		analyse_code,
		validate
	};
}

/**
 * @param {Record<string, any>} exports
 * @returns {{ not_found: Map<string, string[]>; conditions: Set<string> }}
 */
function traverse_exports(exports) {
	/** @type {Map<string, string[]>} */
	const not_found = new Map();
	/** @type {Set<string>} */
	const conditions = new Set();

	/**
	 * @param {Record<string, any>} exports
	 * @param {string} [import_path]
	 */
	function traverse(exports, import_path) {
		for (const key of Object.keys(exports ?? {})) {
			if (import_path) {
				conditions.add(key);
			}

			import_path = import_path || key;
			const _export = exports[key];

			if (typeof _export === 'string') {
				if (!existsSync(_export)) {
					const nope = not_found.get(import_path) ?? [];
					nope.push(_export);
					not_found.set(import_path, nope);
				}
			} else {
				traverse(_export, import_path);
			}
		}
	}

	traverse(exports);

	return { not_found, conditions };
}

/** @param {string} message */
function warn(message) {
	console.log(colors.yellow(message + '\n'));
}
