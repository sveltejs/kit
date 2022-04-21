import * as fs from 'fs';
import * as path from 'path';
import { posixify, mkdirp, walk } from '../utils/filesystem.js';

/**
 * Resolves the `$lib` alias.
 *
 * TODO: make this more generic to also handle other aliases the user could have defined
 * via `kit.vite.resolve.alias`. Also investigate how to do this in a more robust way
 * (right now regex string replacement is used).
 * For more discussion see https://github.com/sveltejs/kit/pull/2453
 *
 * @param {string} file Relative to the lib root
 * @param {string} content
 * @param {import('types').ValidatedConfig} config
 * @returns {string}
 */
export function resolve_lib_alias(file, content, config) {
	/**
	 * @param {string} match
	 * @param {string} _
	 * @param {string} import_path
	 */
	const replace_import_path = (match, _, import_path) => {
		if (!import_path.startsWith('$lib/')) {
			return match;
		}

		const full_path = path.join(config.kit.files.lib, file);
		const full_import_path = path.join(config.kit.files.lib, import_path.slice('$lib/'.length));
		let resolved = posixify(path.relative(path.dirname(full_path), full_import_path));
		resolved = resolved.startsWith('.') ? resolved : './' + resolved;
		return match.replace(import_path, resolved);
	};
	content = content.replace(/from\s+('|")([^"';,]+?)\1/g, replace_import_path);
	content = content.replace(/import\s*\(\s*('|")([^"';,]+?)\1\s*\)/g, replace_import_path);
	return content;
}

/**
 * Strip out lang="X" or type="text/X" tags. Doing it here is only a temporary solution.
 * See https://github.com/sveltejs/kit/issues/2450 for ideas for places where it's handled better.
 *
 * @param {string} content
 */
export function strip_lang_tags(content) {
	return content
		.replace(/(<!--[^]*?-->)|(<script[^>]*?)\s(?:type|lang)=(["']).*?\3/g, '$1$2')
		.replace(/(<!--[^]*?-->)|(<style[^>]*?)\s(?:type|lang)=(["']).*?\3/g, '$1$2');
}

/**
 * @param {string} file
 * @param {Parameters<typeof fs.writeFileSync>[1]} contents
 */
export function write(file, contents) {
	mkdirp(path.dirname(file));
	fs.writeFileSync(file, contents);
}

/**
 * @param {import('types').ValidatedConfig} config
 * @returns {import('./types').File[]}
 */
export function scan(config) {
	return walk(config.kit.files.lib).map((file) => analyze(config, file));
}

/**
 * @param {import('types').ValidatedConfig} config
 * @param {string} file
 * @returns {import('./types').File}
 */
export function analyze(config, file) {
	const name = posixify(file);

	const svelte_extension = config.extensions.find((ext) => name.endsWith(ext));

	const base = svelte_extension ? name : name.slice(0, -path.extname(name).length);

	const dest = svelte_extension
		? name.slice(0, -svelte_extension.length) + '.svelte'
		: name.endsWith('.d.ts')
		? name
		: name.endsWith('.ts')
		? name.slice(0, -3) + '.js'
		: name;

	return {
		name,
		dest,
		base,
		is_included: config.kit.package.files(name),
		is_exported: config.kit.package.exports(name),
		is_svelte: !!svelte_extension
	};
}

/**
 * @param {string} cwd
 * @param {import('./types').File[]} files
 */
export function generate_pkg(cwd, files) {
	const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));

	delete pkg.scripts;
	pkg.type = 'module';

	pkg.exports = {
		'./package.json': './package.json',
		...pkg.exports
	};

	/** @type {Record<string, string>} */
	const clashes = {};

	for (const file of files) {
		if (file.is_included && file.is_exported) {
			const original = `$lib/${file.name}`;
			const entry = `./${file.dest}`;
			const key = entry.replace(/\/index\.js$|(\/[^/]+)\.js$/, '$1');

			if (clashes[key]) {
				throw new Error(
					`Duplicate "${key}" export. Please remove or rename either ${clashes[key]} or ${original}`
				);
			}

			if (!pkg.exports[key]) {
				pkg.exports[key] = entry;
			}

			clashes[key] = original;
		}
	}

	return pkg;
}
