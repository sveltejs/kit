import * as fs from 'node:fs';
import * as path from 'node:path';
import { VERSION } from 'svelte/compiler';
import { posixify, walk } from './filesystem.js';

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
	return adjust_imports(content, (import_path) => {
		for (const [alias, value] of Object.entries(aliases)) {
			if (
				import_path !== alias &&
				!import_path.startsWith(alias + (alias.endsWith('/') ? '' : '/'))
			) {
				continue;
			}

			const full_path = path.join(input, file);
			const full_import_path = path.join(value, import_path.slice(alias.length));
			let resolved = posixify(path.relative(path.dirname(full_path), full_import_path));
			resolved = resolved.startsWith('.') ? resolved : './' + resolved;
			return resolved;
		}
		return import_path;
	});
}

/**
 * Replace .ts extensions with .js in relative import/export statements
 *
 * @param {string} content
 * @returns {string}
 */
export function resolve_ts_endings(content) {
	return adjust_imports(content, (import_path) => {
		if (
			import_path[0] === '.' &&
			((import_path[1] === '.' && import_path[2] === '/') || import_path[1] === '/') &&
			import_path.endsWith('.ts')
		) {
			return import_path.slice(0, -3) + '.js';
		}
		return import_path;
	});
}

/**
 * Adjust import paths
 *
 * @param {string} content
 * @param {(import_path: string) => string} adjust
 * @returns {string}
 */
export function adjust_imports(content, adjust) {
	/**
	 * @param {string} match
	 * @param {string} quote
	 * @param {string} import_path
	 */
	const replace_import_path = (match, quote, import_path) => {
		const adjusted = adjust(import_path);
		if (adjusted !== import_path) {
			return match.replace(quote + import_path + quote, quote + adjusted + quote);
		}
		return match;
	};

	// import/export (type) (xxx | xxx,) { ... } from ...
	content = content.replace(
		/\b(?:import|export)(?:\s+type)?(?:(?:\s+\p{L}[\p{L}0-9]*\s+)|(?:(?:\s+\p{L}[\p{L}0-9]*\s*,\s*)?\s*\{[^}]*\}\s*))from\s*(['"])([^'";]+)\1/gmu,
		(match, quote, import_path) => replace_import_path(match, quote, import_path)
	);

	// import/export (type) * as xxx from ...
	content = content.replace(
		/\b(?:import|export)(?:\s+type)?\s*\*\s*as\s+\p{L}[\p{L}0-9]*\s+from\s*(['"])([^'";]+)\1/gmu,
		(match, quote, import_path) => replace_import_path(match, quote, import_path)
	);

	// export (type) * from ...
	content = content.replace(
		/\b(?:export)(?:\s+type)?\s*\*\s*from\s*(['"])([^'";]+)\1/gmu,
		(match, quote, import_path) => replace_import_path(match, quote, import_path)
	);

	// import(...)
	content = content.replace(
		/\bimport\s*\(\s*(['"])([^'";]+)\1\s*\)/g,
		(match, quote, import_path) => replace_import_path(match, quote, import_path)
	);

	// import '...'
	content = content.replace(/\bimport\s+(['"])([^'";]+)\1/g, (match, quote, import_path) =>
		replace_import_path(match, quote, import_path)
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
	fs.mkdirSync(path.dirname(file), { recursive: true });
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

const comparator =
	/^(\^|~|[<>]=?|=)?v?(\d+|[x*])(?:\.(\d+|[x*]))?(?:\.(\d+|[x*]))?(?:-[\w.-]+)?(?:\+[\w.-]+)?$/i;

/**
 * @param {number} major
 * @param {number} [minor]
 * @param {number} [patch]
 */
function to_number(major, minor = 0, patch = 0) {
	return (major * 1e5 + minor) * 1e5 + patch;
}

/**
 * Whether a version range allows a Svelte 3 release. Version specs that are not
 * semver ranges, e.g. "latest" or "next" or catalog references, do not
 *
 * @param {string} range
 * @returns {boolean}
 */
export function allows_svelte_3(range) {
	let allowed = false;

	for (const set of range.split('||')) {
		let min = 0;
		let max = Infinity;

		const comparators = set
			.trim()
			.replace(/^(\S+)\s+-\s+(\S+)$/, '>=$1 <=$2')
			.replace(/([<>=~^])\s+/g, '$1')
			.split(/\s+/);

		for (const str of comparators) {
			if (str === '') continue;

			const match = comparator.exec(str);
			if (!match) return false;

			const [, operator, ...parts] = match;
			const wildcard = parts.findIndex((part) => part === undefined || /[x*]/i.test(part));
			const [major, minor, patch] = parts.slice(0, wildcard === -1 ? 3 : wildcard).map(Number);
			if (major === undefined) continue;

			const version = to_number(major, minor, patch);
			// the first version that a partial version such as `3` or `3.1` no longer covers
			const next =
				minor === undefined
					? to_number(major + 1)
					: patch === undefined
						? to_number(major, minor + 1)
						: version + 1;

			if (operator === '>=') {
				min = Math.max(min, version);
			} else if (operator === '>') {
				min = Math.max(min, next);
			} else if (operator === '<') {
				max = Math.min(max, version);
			} else if (operator === '<=') {
				max = Math.min(max, next);
			} else {
				min = Math.max(min, version);

				if (operator === '^') {
					// `^0.x` is narrower than this, but ends below 1.0.0 either way
					max = Math.min(max, to_number(major + 1));
				} else if (operator === '~' && minor !== undefined) {
					max = Math.min(max, to_number(major, minor + 1));
				} else {
					max = Math.min(max, next);
				}
			}
		}

		allowed ||= Math.max(min, to_number(3)) < Math.min(max, to_number(4));
	}

	return allowed;
}
