import MagicString from 'magic-string';
import * as svelte from 'svelte/compiler';

/** @typedef {ReturnType<typeof import('svelte/compiler').parseCss>['children']} StyleSheetChildren */

/** @typedef {{ property: string; value: string; start: number; end: number; type: 'Declaration' }} Declaration */

const parse = svelte.parseCss
	? svelte.parseCss
	: /** @param {string} css */
		(css) => {
			return /** @type {{ css: { children: StyleSheetChildren } }} */ (
				svelte.parse(`<style>${css}</style>`)
			).css;
		};

const SKIP_PARSING_REGEX = /url\(/i;

/** Capture a single url(...) so we can process them one at a time */
const URL_FUNCTION_REGEX = /url\(\s*.*?\)/gi;

/** Captures the value inside a CSS url(...) */
const URL_PARAMETER_REGEX = /url\(\s*(['"]?)(.*?)\1\s*\)/i;

/** Splits the URL if there's a query string or hash fragment */
const HASH_OR_QUERY_REGEX = /[#?]/;

/**
 * Assets handled by Vite that are referenced in the stylesheet always start
 * with this prefix because Vite emits them into the same directory as the CSS file
 */
const VITE_ASSET_PREFIX = './';

const AST_OFFSET = '<style>'.length;

/**
 * We need to fix the asset URLs in the CSS before we inline them into a document
 * because they are now relative to the document instead of the CSS file.
 * @param {{
 * 	css: string;
 * 	vite_assets: Set<string>;
 * 	static_assets: Set<string>;
 * 	paths_assets: string;
 * 	base: string;
 * 	static_asset_prefix: string;
 * }} opts
 * @returns {string}
 */
export function fix_css_urls({
	css,
	vite_assets,
	static_assets,
	paths_assets,
	base,
	static_asset_prefix
}) {
	// skip parsing if there are no url(...) occurrences
	if (!SKIP_PARSING_REGEX.test(css)) {
		return css;
	}

	// safe guard in case of trailing slashes (but this should never happen)
	if (paths_assets.endsWith('/')) {
		paths_assets = paths_assets.slice(0, -1);
	}

	if (base.endsWith('/')) {
		base = base.slice(0, -1);
	}

	const s = new MagicString(css);

	const parsed = parse(css);

	for (const child of parsed.children) {
		find_declarations(child, (declaration) => {
			if (!SKIP_PARSING_REGEX.test) return;

			const cleaned = tippex_comments_and_strings(declaration.value);

			/** @type {string} */
			let new_value = declaration.value;

			/** @type {RegExpExecArray | null} */
			let url_function_found;
			URL_FUNCTION_REGEX.lastIndex = 0;
			while ((url_function_found = URL_FUNCTION_REGEX.exec(cleaned))) {
				const [url_function] = url_function_found;

				// After finding a legitimate url(...), we want to operate on the original
				// that may have a string inside it
				const original_url_function = declaration.value.slice(
					url_function_found.index,
					url_function_found.index + url_function.length
				);

				const url_parameter_found = URL_PARAMETER_REGEX.exec(original_url_function);
				if (!url_parameter_found) continue;

				const [, , url] = url_parameter_found;
				const [url_without_hash_or_query] = url.split(HASH_OR_QUERY_REGEX);

				/** @type {string | undefined} */
				let new_prefix;

				// Check if it's an asset processed by Vite...
				let current_prefix = url_without_hash_or_query.slice(0, VITE_ASSET_PREFIX.length);
				let filename = url_without_hash_or_query.slice(VITE_ASSET_PREFIX.length);
				const decoded = decodeURIComponent(filename);

				if (current_prefix === VITE_ASSET_PREFIX && vite_assets.has(decoded)) {
					new_prefix = paths_assets;
				} else {
					// ...or if it's from the static directory
					current_prefix = url_without_hash_or_query.slice(0, static_asset_prefix.length);
					filename = url_without_hash_or_query.slice(static_asset_prefix.length);
					const decoded = decodeURIComponent(filename);

					if (current_prefix === static_asset_prefix && static_assets.has(decoded)) {
						new_prefix = base;
					}
				}

				if (!new_prefix) continue;

				new_value = new_value.replace(`${current_prefix}${filename}`, `${new_prefix}/${filename}`);
			}

			if (declaration.value === new_value) return;

			if (!svelte.parseCss) {
				declaration.start = declaration.start - AST_OFFSET;
				declaration.end = declaration.end - AST_OFFSET;
			}

			s.update(declaration.start, declaration.end, `${declaration.property}: ${new_value}`);
		});
	}

	return s.toString();
}

/**
 * @param {StyleSheetChildren[0]} rule
 * @param {(declaration: Declaration) => void} callback
 */
function find_declarations(rule, callback) {
	// Vite already inlines relative @import rules, so we don't need to handle them here
	if (!rule.block) return;

	for (const child of rule.block.children) {
		if (child.type !== 'Declaration') {
			find_declarations(child, callback);
			continue;
		}
		callback(child);
	}
}

/**
 * Replaces comment and string contents with whitespace.
 * @param {string} value
 * @returns {string}
 */
export function tippex_comments_and_strings(value) {
	let new_value = '';
	let escaped = false;
	let in_comment = false;

	/** @type {null | '"' | "'"} */
	let quote_mark = null;

	let i = 0;
	while (i < value.length) {
		const char = value[i];

		if (in_comment) {
			if (char === '*' && value[i + 1] === '/') {
				in_comment = false;
				new_value += char;
			} else {
				new_value += ' ';
			}
		} else if (!quote_mark && char === '/' && value[i + 1] === '*') {
			in_comment = true;
			new_value += '/*';
			i++; // skip the '*' since we already added it
		} else if (escaped) {
			new_value += ' ';
			escaped = false;
		} else if (quote_mark && char === '\\') {
			escaped = true;
			new_value += ' ';
		} else if (char === quote_mark) {
			quote_mark = null;
			new_value += char;
		} else if (quote_mark) {
			new_value += ' ';
		} else if (quote_mark === null && (char === '"' || char === "'")) {
			quote_mark = char;
			new_value += char;
		} else {
			new_value += char;
		}

		i++;
	}

	return new_value;
}
