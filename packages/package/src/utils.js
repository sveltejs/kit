import * as fs from 'node:fs';
import * as path from 'node:path';
import { VERSION } from 'svelte/compiler';
import { posixify, mkdirp, walk } from './filesystem.js';

const is_svelte_5_plus = Number(VERSION.split('.')[0]) >= 5;

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
	 * @param {string} import_path
	 */
	const replace_import_path = (match, import_path) => {
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

	// import/export ... from ...
	content = content.replace(
		/\b(import|export)\s+([\w*\s{},]*)\s+from\s+(['"])([^'";]+)\3/g,
		(_, keyword, specifier, quote, import_path) =>
			replace_import_path(
				`${keyword} ${specifier} from ${quote}${import_path}${quote}`,
				import_path
			)
	);

	// import(...)
	content = content.replace(/\bimport\s*\(\s*(['"])([^'";]+)\1\s*\)/g, (_, quote, import_path) =>
		replace_import_path(`import(${quote}${import_path}${quote})`, import_path)
	);

	// import '...'
	content = content.replace(/\bimport\s+(['"])([^'";]+)\1/g, (_, quote, import_path) =>
		replace_import_path(`import ${quote}${import_path}${quote}`, import_path)
	);

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
			// Things like application/ld+json should be kept as-is. Preprocessed languages are "ts" etc.
			// Svelte 5 deals with TypeScript natively, and in the template, too, therefore keep it in.
			// Not removing it would mean Svelte parses without its TS plugin and then runs into errors.
			(match, comment, tag_open, _, type) =>
				type?.startsWith('application/') || (is_svelte_5_plus && type === 'ts')
					? match
					: (comment ?? '') + (tag_open ?? '')
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
 * @returns {import('./types.js').File[]}
 */
export function scan(input, extensions) {
	return walk(input).map((file) => analyze(file, extensions));
}

/**
 * @param {string} file
 * @param {string[]} extensions
 * @returns {import('./types.js').File}
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
