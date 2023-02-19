import * as fs from 'fs';
import * as path from 'path';
import { posixify, mkdirp, walk } from './filesystem.js';

/**
 * Resolves aliases
 *
 * @param {string} input
 * @param {string} file Relative to the input
 * @param {string} content
 * @param {Record<string, string>} aliases
 * @returns {string}
 */
export function resolve_aliases(input, file, content, aliases) {
	/**
	 * @param {string} match
	 * @param {string} _
	 * @param {string} import_path
	 */
	const replace_import_path = (match, _, import_path) => {
		for (const [alias, value] of Object.entries(aliases)) {
			if (!import_path.startsWith(alias)) continue;

			const full_path = path.join(input, file);
			const full_import_path = path.join(value, import_path.slice(alias.length));
			let resolved = posixify(path.relative(path.dirname(full_path), full_import_path));
			resolved = resolved.startsWith('.') ? resolved : './' + resolved;
			return match.replace(import_path, resolved);
		}
		return match;
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
		.replace(
			/(<!--[^]*?-->)|(<script[^>]*?)\s(?:type|lang)=(["'])(.*?)\3/g,
			// things like application/ld+json should be kept as-is. Preprocessed languages are "ts" etc
			(match, s1, s2, _, s4) => (s4?.startsWith('application/') ? match : (s1 ?? '') + (s2 ?? ''))
		)
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
 * @param {string} input
 * @param {string[]} extensions
 * @returns {import('./types').File[]}
 */
export function scan(input, extensions) {
	return walk(input).map((file) => analyze(file, extensions));
}

/**
 * @param {string} file
 * @param {string[]} extensions
 * @returns {import('./types').File}
 */
export function analyze(file, extensions) {
	const name = posixify(file);

	const svelte_extension = extensions.find((ext) => name.endsWith(ext));

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
		is_svelte: !!svelte_extension
	};
}
