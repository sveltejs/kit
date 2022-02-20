// dict from https://github.com/yahoo/serialize-javascript/blob/183c18a776e4635a379fdc620f81771f219832bb/index.js#L25
/** @type {Record<string, string>} */
const escape_json_in_html_dict = {
	'<': '\\u003C',
	'>': '\\u003E',
	'/': '\\u002F',
	'\u2028': '\\u2028',
	'\u2029': '\\u2029'
};

const escape_json_in_html_regex = new RegExp(
	`[${Object.keys(escape_json_in_html_dict).join('')}]`,
	'g'
);

/**
 * Escape a JSONValue that's going to be embedded in a `<script>` tag
 * @param {import('types').JSONValue} val
 */
export function escape_json_in_html(val) {
	return JSON.stringify(val).replace(
		escape_json_in_html_regex,
		(match) => escape_json_in_html_dict[match]
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

/**
 * When inside a double-quoted attribute value, only `&` and `"` hold special meaning.
 * @see https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(double-quoted)-state
 * @type {Record<string, string>}
 */
const escape_html_attr_dict = {
	'&': '&amp;',
	'"': '&quot;'
};

/**
 * Formats a string to be used as an attribute's value in raw HTML.
 *
 * It escapes unpaired surrogates (which are allowed in js strings but invalid in HTML), escapes
 * characters that are special in attributes, and surrounds the whole string in double-quotes.
 *
 * @param {string} str
 * @returns {string} Escaped string surrounded by double-quotes.
 * @example const html = `<tag data-value=${escape_html_attr('value')}>...</tag>`;
 */
export function escape_html_attr(str) {
	return '"' + escape(str, escape_html_attr_dict, (code) => `&#${code};`) + '"';
}
