import fs from 'node:fs';
import path from 'node:path';

/**
 * Reads the `imports` field from the package.json at the given directory.
 * @param {string} cwd
 * @returns {Record<string, string | Record<string, string>> | undefined}
 */
export function read_package_imports(cwd) {
	const pkg_path = path.resolve(cwd, 'package.json');
	if (fs.existsSync(pkg_path)) {
		try {
			return JSON.parse(fs.readFileSync(pkg_path, 'utf-8')).imports;
		} catch {
			// malformed package.json — ignore, the user will see other errors
		}
	}
}

/**
 * Normalizes an import value to a string path, handling both string values
 * and conditional export objects (using the `default` key).
 * @param {string | Record<string, string>} value
 * @returns {string | null}
 */
export function normalize_import_value(value) {
	if (typeof value === 'string') {
		return value.replace(/^\.\//, '');
	}
	if (value && typeof value === 'object' && typeof value.default === 'string') {
		return value.default.replace(/^\.\//, '');
	}
	return null;
}

/**
 * Returns the `#`-prefixed import keys from the package.json `imports` field.
 * @param {string} cwd
 * @returns {string[]}
 */
export function get_hash_import_keys(cwd) {
	const imports = read_package_imports(cwd);
	if (!imports) return [];
	return Object.keys(imports).filter((key) => key.startsWith('#'));
}

/**
 * Computes alias entries for `normalize_id` from the package.json `imports` field.
 * Each entry maps a `#xx` alias to its absolute target path. Entries are sorted
 * by path length descending so that longer/more-specific paths are matched first.
 *
 * @param {string} root
 * @param {(p: string) => string} [normalize] - optional path normalizer (e.g. `vite.normalizePath`)
 * @returns {Array<{ alias: string, path: string }>}
 */
export function get_import_aliases(root, normalize) {
	const imports = read_package_imports(root);
	if (!imports) return [];

	/** @type {Array<{ alias: string, path: string }>} */
	const aliases = [];

	for (const [key, raw_value] of Object.entries(imports)) {
		if (!key.startsWith('#')) continue;

		const value = normalize_import_value(raw_value);
		if (!value) continue;

		// For `#xx/*` imports, the target directory is the value without `/*`
		// For `#xx` imports, the target is the file itself
		const target = value.endsWith('/*') ? value.slice(0, -2) : value;
		if (target.includes('*')) continue; // not sure if this is even allowed in Node, anyway it's too niche/complex to support here
		const abs = path.resolve(root, target);
		const alias = key.endsWith('/*') ? key.slice(0, -2) : key;

		aliases.push({ alias, path: normalize ? normalize(abs) : abs });
	}

	// Sort by path length descending so longer/more-specific paths match first
	aliases.sort((a, b) => b.path.length - a.path.length);

	return aliases;
}
