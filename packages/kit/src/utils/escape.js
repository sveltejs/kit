/**
 * When inside a double-quoted attribute value, only `&` and `"` hold special meaning.
 * @see https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(double-quoted)-state
 * @type {Record<string, string>}
 */
const escape_html_attr_dict = {
	'&': '&amp;',
	'"': '&quot;'
};

const escape_html_attr_regex = new RegExp(
	// special characters
	`[${Object.keys(escape_html_attr_dict).join('')}]|` +
		// high surrogate without paired low surrogate
		'[\\ud800-\\udbff](?![\\udc00-\\udfff])|' +
		// a valid surrogate pair, the only match with 2 code units
		// we match it so that we can match unpaired low surrogates in the same pass
		// TODO: use lookbehind assertions once they are widely supported: (?<![\ud800-udbff])[\udc00-\udfff]
		'[\\ud800-\\udbff][\\udc00-\\udfff]|' +
		// unpaired low surrogate (see previous match)
		'[\\udc00-\\udfff]',
	'g'
);

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
	const escaped_str = str.replace(escape_html_attr_regex, (match) => {
		if (match.length === 2) {
			// valid surrogate pair
			return match;
		}

		return escape_html_attr_dict[match] ?? `&#${match.charCodeAt(0)};`;
	});

	return `"${escaped_str}"`;
}
