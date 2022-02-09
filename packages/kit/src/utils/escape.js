/** @type {Record<string, string>} */
const escape_json_in_html_dict = {
	'&': '\\u0026',
	'>': '\\u003e',
	'<': '\\u003c',
	'\u2028': '\\u2028',
	'\u2029': '\\u2029'
};

/** @type {Record<string, string>} */
const escape_json_value_in_html_dict = {
	'"': '\\"',
	'<': '\\u003C',
	'>': '\\u003E',
	'/': '\\u002F',
	'\\': '\\\\',
	'\b': '\\b',
	'\f': '\\f',
	'\n': '\\n',
	'\r': '\\r',
	'\t': '\\t',
	'\0': '\\0',
	'\u2028': '\\u2028',
	'\u2029': '\\u2029'
};

/**
 * Escape a stringified JSON object that's going to be embedded in a `<script>` tag
 * @param {string} str
 */
export function escape_json_in_html(str) {
	// adapted from https://github.com/vercel/next.js/blob/694407450638b037673c6d714bfe4126aeded740/packages/next/server/htmlescape.ts
	// based on https://github.com/zertosh/htmlescape
	// License: https://github.com/zertosh/htmlescape/blob/0527ca7156a524d256101bb310a9f970f63078ad/LICENSE
	return str.replace(/[&><\u2028\u2029]/g, (match) => escape_json_in_html_dict[match]);
}

/**
 * Escape a string JSON value to be embedded into a `<script>` tag
 * @param {string} str
 */
export function escape_json_value_in_html(str) {
	return escape(
		str,
		escape_json_value_in_html_dict,
		(code) => `\\u${code.toString(16).toUpperCase()}`
	);
}

/**
 * @param str {string} string to escape
 * @param dict {Record<string, string>} dictionary of character replacements
 * @param unicode_encoder {function(number): string} encoder to use for high unicode characters
 * @returns {string}
 */
function escape(str, dict, unicode_encoder) {
	let result = '';

	for (let i = 0; i < str.length; i += 1) {
		const char = str.charAt(i);
		const code = char.charCodeAt(0);

		if (char in dict) {
			result += dict[char];
		} else if (code >= 0xd800 && code <= 0xdfff) {
			const next = str.charCodeAt(i + 1);

			// If this is the beginning of a [high, low] surrogate pair,
			// add the next two characters, otherwise escape
			if (code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) {
				result += char + str[++i];
			} else {
				result += unicode_encoder(code);
			}
		} else {
			result += char;
		}
	}

	return result;
}

/** @type {Record<string, string>} */
const escape_html_attr_dict = {
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;'
};

/**
 * use for escaping string values to be used html attributes on the page
 * e.g.
 * <script data-url="here">
 *
 * @param {string} str
 * @returns string escaped string
 */
export function escape_html_attr(str) {
	return '"' + escape(str, escape_html_attr_dict, (code) => `&#${code};`) + '"';
}
