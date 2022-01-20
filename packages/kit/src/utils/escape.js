/** @type {Record<string, string>} */
const escape_json_string_in_html_dict = {
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

/** @param {string} str */
export function escape_json_string_in_html(str) {
	return escape(
		str,
		escape_json_string_in_html_dict,
		(code) => `\\u${code.toString(16).toUpperCase()}`
	);
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

/**
 *
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
