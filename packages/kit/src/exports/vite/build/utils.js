import fs from 'node:fs';
import path from 'node:path';
import { normalizePath } from 'vite';

/**
 * Adds transitive JS and CSS dependencies to the js and css inputs.
 * @param {import('vite').Manifest} manifest
 * @param {string} entry
 * @param {boolean} add_dynamic_css
 * @returns {import('types').AssetDependencies}
 */
export function find_deps(manifest, entry, add_dynamic_css) {
	/** @type {Set<string>} */
	const seen = new Set();

	/** @type {Set<string>} */
	const imports = new Set();

	/** @type {Set<string>} */
	const stylesheets = new Set();

	/** @type {Set<string>} */
	const fonts = new Set();

	/**
	 * @param {string} current
	 * @param {boolean} add_js
	 */
	function traverse(current, add_js) {
		if (seen.has(current)) return;
		seen.add(current);

		const { chunk } = resolve_symlinks(manifest, current);

		if (add_js) imports.add(chunk.file);

		if (chunk.assets) {
			for (const asset of chunk.assets) {
				if (/\.(woff2?|ttf|otf)$/.test(asset)) {
					fonts.add(asset);
				}
			}
		}

		if (chunk.css) {
			chunk.css.forEach((file) => stylesheets.add(file));
		}

		if (chunk.imports) {
			chunk.imports.forEach((file) => traverse(file, add_js));
		}

		if (add_dynamic_css && chunk.dynamicImports) {
			chunk.dynamicImports.forEach((file) => traverse(file, false));
		}
	}

	const { chunk, file } = resolve_symlinks(manifest, entry);

	traverse(file, true);

	return {
		file: chunk.file,
		imports: Array.from(imports),
		stylesheets: Array.from(stylesheets),
		fonts: Array.from(fonts)
	};
}

/**
 * @param {import('vite').Manifest} manifest
 * @param {string} file
 */
export function resolve_symlinks(manifest, file) {
	while (!manifest[file]) {
		const next = normalizePath(path.relative('.', fs.realpathSync(file)));
		if (next === file) throw new Error(`Could not find file "${file}" in Vite manifest`);
		file = next;
	}

	const chunk = manifest[file];

	return { chunk, file };
}

/**
 * @param {import('types').ValidatedKitConfig} config
 * @returns {string}
 */
export function assets_base(config) {
	return (config.paths.assets || config.paths.base || '.') + '/';
}

const method_names = new Set(['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS']);

// If we'd written this in TypeScript, it could be easy...
/**
 * @param {string} str
 * @returns {str is import('types').HttpMethod}
 */
export function is_http_method(str) {
	return method_names.has(str);
}
