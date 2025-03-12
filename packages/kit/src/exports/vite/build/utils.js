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
	const imported_assets = new Set();

	/** @type {Map<string, { css: string[]; assets: string[] }>} */
	const stylesheet_map = new Map();

	/**
	 * @param {string} current
	 * @param {boolean} add_js
	 * @param {number} dynamic_import_depth
	 */
	function traverse(current, add_js, dynamic_import_depth = 0) {
		if (seen.has(current)) return;
		seen.add(current);

		const { chunk } = resolve_symlinks(manifest, current);

		if (add_js) imports.add(chunk.file);

		if (chunk.assets) {
			chunk.assets.forEach(asset => imported_assets.add(asset));
		}

		if (chunk.css) {
			chunk.css.forEach((file) => stylesheets.add(file));
		}

		if (chunk.imports) {
			chunk.imports.forEach((file) => traverse(file, add_js, dynamic_import_depth));
		}

		if (!add_dynamic_css) return;

		if (dynamic_import_depth <= 1) {
			stylesheet_map.set(current, {
				css: chunk.css ?? [], assets: chunk.assets ?? []
			});
		}

		if (chunk.dynamicImports) {
			dynamic_import_depth++;
			chunk.dynamicImports.forEach((file) => {
				traverse(file, false, dynamic_import_depth);
			});
		}
	}

	const { chunk, file } = resolve_symlinks(manifest, entry);

	traverse(file, true);

	const assets = Array.from(imported_assets);

	return {
		assets,
		file: chunk.file,
		imports: Array.from(imports),
		stylesheets: Array.from(stylesheets),
		// TODO do we need this separately?
		fonts: filter_fonts(assets),
		stylesheet_map
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
 * @param {string[]} assets 
 * @returns {string[]}
 */
export function filter_fonts(assets) {
	return assets.filter((asset) => /\.(woff2?|ttf|otf)$/.test(asset));
}

const method_names = new Set((['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS']));

// If we'd written this in TypeScript, it could be easy...
/**
 * @param {string} str
 * @returns {str is import('types').HttpMethod}
 */
export function is_http_method(str) {
	return method_names.has(str);
}

/**
 * @param {import('types').ValidatedKitConfig} config
 * @returns {string}
 */
export function assets_base(config) {
	return (config.paths.assets || config.paths.base || '.') + '/';
}
