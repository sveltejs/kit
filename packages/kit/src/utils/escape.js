import { s } from './misc.js';

/**
 * When inside a double-quoted attribute value, only `&` and `"` hold special meaning.
 * @see https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(double-quoted)-state
 * @type {Record<string, string>}
 */
const escape_html_attr_dict = {
	'&': '&amp;',
	'"': '&quot;'
	// Svelte also escapes < because the escape function could be called inside a `noscript` there
	// https://github.com/sveltejs/svelte/security/advisories/GHSA-8266-84wp-wv5c
	// However, that doesn't apply in SvelteKit
};

/**
 * @type {Record<string, string>}
 */
const escape_html_dict = {
	'&': '&amp;',
	'<': '&lt;'
};

// `\p{Surrogate}` only matches unpaired surrogates with the `u` flag (a pair is one code point)
/** @param {Record<string, string>} dict */
const escape_regex = (dict) => new RegExp(`[${Object.keys(dict).join('')}]|\\p{Surrogate}`, 'gu');

const escape_html_attr_regex = escape_regex(escape_html_attr_dict);
const escape_html_regex = escape_regex(escape_html_dict);

/**
 * Escapes unpaired surrogates (which are allowed in js strings but invalid in HTML) and
 * escapes characters that are special.
 *
 * @param {string} str
 * @param {boolean} [is_attr]
 * @returns {string} escaped string
 * @example const html = `<tag data-value="${escape_html('value', true)}">...</tag>`;
 */
export function escape_html(str, is_attr) {
	const dict = is_attr ? escape_html_attr_dict : escape_html_dict;
	const escaped_str = str.replace(
		is_attr ? escape_html_attr_regex : escape_html_regex,
		(match) => dict[match] ?? `&#${match.charCodeAt(0)};`
	);

	return escaped_str;
}

/** @typedef {{ placeholder: string, replacement: string }} Replacement */

/**
 * Escapes backslashes, backticks, and dollar signs so that the string can be
 * safely used as part of a template literal.
 * @param {string} str
 * @param {Replacement[]} replacements Placeholders to replace after escaping.
 * 																		 This is necessary when the string contains
 * 																		 placeholders that we want to preserve, such as `${assets}`
 * @returns {string} escaped string
 */
export function escape_for_interpolation(str, replacements) {
	let escaped = s(str).slice(1, -1).replaceAll('`', '\\`').replaceAll('$', '\\$');
	for (const { placeholder, replacement } of replacements) {
		escaped = escaped.replaceAll(placeholder, replacement);
	}
	return escaped;
}
