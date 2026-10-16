import MagicString from 'magic-string';
import { parseCss } from 'svelte/compiler';

/** @typedef {ReturnType<typeof parseCss>['children']} StyleSheetChildren */

/** @typedef {{ property: string; value: string; start: number; end: number; type: 'Declaration' }} Declaration */

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

	const parsed = parseCss(css);

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

			s.update(declaration.start, declaration.end, `${declaration.property}: ${new_value}`);
		});
	}

	return s.toString();
}

/**
 * Moves the top-level `@font-face` rules out of a stylesheet, reading it the way browsers tokenize
 * CSS (https://drafts.csswg.org/css-syntax-3/#tokenization). Returns `null` if that could change
 * what the stylesheet means: if it has a `@font-face` anywhere else (in `@media` or `@layer`, say),
 * an `@import` or `@namespace`, a bad string or URL, or anything left open at the end, which would
 * carry on into the next stylesheet when they're concatenated
 * @param {string} css
 * @returns {{ font_faces: string; rest: string } | null}
 */
export function split_font_faces(css) {
	/** @type {number[]} the closing bracket of each open block */
	const closers = [];

	/** @type {Array<[number, number]>} */
	const font_faces = [];

	// where the current top-level rule starts (-1 between rules), and what it is
	let start = -1;
	let at_rule = false;
	let font_face = false;

	let i = 0;

	while (i < css.length) {
		const c = css.charCodeAt(i);

		if (is_whitespace(c)) {
			i += 1;
			continue;
		}

		if (c === 0x2f && css.charCodeAt(i + 1) === 0x2a) {
			const end = css.indexOf('*/', i + 2);
			if (end === -1) return null;
			i = end + 2;
			continue;
		}

		const top = closers.length === 0;
		const begins = top && start === -1;
		if (begins) {
			start = i;
			at_rule = false;
			font_face = false;
		}

		if (c === 0x22 || c === 0x27) {
			i = skip_string(css, i);
			if (i === -1) return null;
		} else if (c === 0x40 && starts_ident(css, i + 1)) {
			const end = skip_ident(css, i + 1);
			const name = decode_ident(css.slice(i + 1, end));
			if (name === 'import' || name === 'namespace') return null;
			if (name === 'font-face') {
				if (!begins) return null;
				font_face = true;
			}
			if (begins) at_rule = true;
			i = end;
		} else if (starts_number(css, i)) {
			i = skip_number(css, i);
		} else if (c === 0x23 && (is_ident_char(css.charCodeAt(i + 1)) || is_escape(css, i + 1))) {
			i = skip_ident(css, i + 1);
		} else if (starts_ident(css, i)) {
			const end = skip_ident(css, i);
			const name = css.charCodeAt(end) === 0x28 ? decode_ident(css.slice(i, end)) : null;
			i = end;

			if (name === 'url') {
				let j = i + 1;
				while (is_whitespace(css.charCodeAt(j))) j += 1;

				const next = css.charCodeAt(j);
				if (next === 0x22 || next === 0x27) {
					closers.push(0x29);
					i = j;
				} else {
					i = skip_url(css, j);
					if (i === -1) return null;
				}
			} else if (name !== null) {
				closers.push(0x29);
				i += 1;
			}
		} else if (c === 0x7b || c === 0x5b || c === 0x28) {
			closers.push(c === 0x7b ? 0x7d : c === 0x5b ? 0x5d : 0x29);
			i += 1;
		} else if (c === 0x7d || c === 0x5d || c === 0x29) {
			if (top) return null;

			if (c === closers[closers.length - 1]) {
				closers.pop();

				if (closers.length === 0 && c === 0x7d) {
					if (font_face) font_faces.push([start, i + 1]);
					start = -1;
				}
			}

			i += 1;
		} else if (c === 0x3b && top) {
			if (!at_rule || font_face) return null;
			start = -1;
			i += 1;
		} else {
			i += 1;
		}
	}

	if (closers.length > 0 || start !== -1) return null;

	let rest = '';
	let last = 0;

	for (const [from, to] of font_faces) {
		rest += css.slice(last, from);
		last = to;
	}

	return {
		font_faces: font_faces.map(([from, to]) => css.slice(from, to)).join('\n'),
		rest: rest + css.slice(last)
	};
}

/** @param {number} c */
function is_whitespace(c) {
	return c === 0x20 || c === 0x09 || is_newline(c);
}

/** @param {number} c */
function is_newline(c) {
	return c === 0x0a || c === 0x0d || c === 0x0c;
}

/** @param {number} c */
function is_hex(c) {
	return (c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x46) || (c >= 0x61 && c <= 0x66);
}

/** @param {number} c */
function is_digit(c) {
	return c >= 0x30 && c <= 0x39;
}

/** @param {number} c */
function is_ident_start(c) {
	// NULL is read as U+FFFD
	return (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) || c === 0x5f || c >= 0x80 || c === 0;
}

/** @param {number} c */
function is_ident_char(c) {
	return is_ident_start(c) || is_digit(c) || c === 0x2d;
}

/**
 * Whether a valid escape starts at `i`
 * @param {string} css
 * @param {number} i
 */
function is_escape(css, i) {
	return css.charCodeAt(i) === 0x5c && !is_newline(css.charCodeAt(i + 1));
}

/**
 * @param {string} css
 * @param {number} i
 */
function starts_ident(css, i) {
	const c = css.charCodeAt(i);
	if (c === 0x2d) {
		const next = css.charCodeAt(i + 1);
		return is_ident_start(next) || next === 0x2d || is_escape(css, i + 1);
	}
	return is_ident_start(c) || is_escape(css, i);
}

/**
 * @param {string} css
 * @param {number} i
 */
function starts_number(css, i) {
	if (css.charCodeAt(i) === 0x2b || css.charCodeAt(i) === 0x2d) i += 1;
	if (css.charCodeAt(i) === 0x2e) i += 1;
	return is_digit(css.charCodeAt(i));
}

/**
 * Returns the end of the escape whose backslash is at `i`
 * @param {string} css
 * @param {number} i
 */
function skip_escape(css, i) {
	let j = i + 1;
	while (j - i <= 6 && is_hex(css.charCodeAt(j))) j += 1;
	if (j === i + 1) return j + 1;
	if (css.charCodeAt(j) === 0x0d && css.charCodeAt(j + 1) === 0x0a) return j + 2;
	return is_whitespace(css.charCodeAt(j)) ? j + 1 : j;
}

/**
 * @param {string} css
 * @param {number} i
 */
function skip_ident(css, i) {
	while (i < css.length) {
		if (is_ident_char(css.charCodeAt(i))) i += 1;
		else if (is_escape(css, i)) i = skip_escape(css, i);
		else break;
	}
	return i;
}

/**
 * Returns an ident's value, with escapes decoded and ASCII letters lowercased
 * @param {string} ident
 */
function decode_ident(ident) {
	return ident
		.replace(/\\(?:([0-9a-fA-F]{1,6})(?:\r\n|[ \t\n\r\f])?|([^]))/g, (_, hex, char) => {
			if (char !== undefined) return char;
			const code = parseInt(hex, 16);
			return code === 0 || (code >= 0xd800 && code <= 0xdfff) || code > 0x10ffff
				? '�'
				: String.fromCodePoint(code);
		})
		.replace(/[A-Z]/g, (char) => char.toLowerCase());
}

/**
 * Returns the end of the number (with its unit, if any) at `i`
 * @param {string} css
 * @param {number} i
 */
function skip_number(css, i) {
	if (css.charCodeAt(i) === 0x2b || css.charCodeAt(i) === 0x2d) i += 1;
	while (is_digit(css.charCodeAt(i))) i += 1;
	if (css.charCodeAt(i) === 0x2e && is_digit(css.charCodeAt(i + 1))) {
		i += 1;
		while (is_digit(css.charCodeAt(i))) i += 1;
	}

	const e = css.charCodeAt(i);
	if (e === 0x45 || e === 0x65) {
		const sign = css.charCodeAt(i + 1) === 0x2b || css.charCodeAt(i + 1) === 0x2d ? 1 : 0;
		if (is_digit(css.charCodeAt(i + 1 + sign))) {
			i += 1 + sign;
			while (is_digit(css.charCodeAt(i))) i += 1;
		}
	}

	if (starts_ident(css, i)) return skip_ident(css, i);
	return css.charCodeAt(i) === 0x25 ? i + 1 : i;
}

/**
 * Returns the end of the string whose quote is at `i`, or -1 if it's a bad or unclosed string
 * @param {string} css
 * @param {number} i
 */
function skip_string(css, i) {
	const quote = css.charCodeAt(i);
	i += 1;

	while (i < css.length) {
		const c = css.charCodeAt(i);
		if (c === quote) return i + 1;
		if (is_newline(c)) return -1;

		if (c !== 0x5c) i += 1;
		else if (css.charCodeAt(i + 1) === 0x0d && css.charCodeAt(i + 2) === 0x0a) i += 3;
		else if (is_newline(css.charCodeAt(i + 1))) i += 2;
		else i = skip_escape(css, i);
	}

	return -1;
}

/**
 * Returns the end of the unquoted `url(` whose contents start at `i`, or -1 if it's a bad or
 * unclosed URL
 * @param {string} css
 * @param {number} i
 */
function skip_url(css, i) {
	while (i < css.length) {
		const c = css.charCodeAt(i);
		if (c === 0x29) return i + 1;

		if (is_whitespace(c)) {
			while (is_whitespace(css.charCodeAt(i))) i += 1;
			return css.charCodeAt(i) === 0x29 ? i + 1 : -1;
		}

		// quotes, `(` and non-printable characters make it a bad URL (NULL is read as U+FFFD)
		if (c === 0x22 || c === 0x27 || c === 0x28 || (c > 0 && c <= 0x08)) return -1;
		if (c === 0x0b || (c >= 0x0e && c <= 0x1f) || c === 0x7f) return -1;

		if (c !== 0x5c) i += 1;
		else if (is_escape(css, i)) i = skip_escape(css, i);
		else return -1;
	}

	return -1;
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
