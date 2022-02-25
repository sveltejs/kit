/**
 * Inside a script element, only `</script` and `<!--` hold special meaning to the HTML parser.
 *
 * The first closes the script element, so everything after is treated as raw HTML.
 * The second disables further parsing until `-->`, so the script element might be unexpectedly
 * kept open until until an unrelated HTML comment in the page.
 *
 * U+2028 LINE SEPARATOR and U+2029 PARAGRAPH SEPARATOR are escaped for the sake of pre-2018
 * browsers.
 *
 * @see tests for unsafe parsing examples.
 * @see https://html.spec.whatwg.org/multipage/scripting.html#restrictions-for-contents-of-script-elements
 * @see https://html.spec.whatwg.org/multipage/syntax.html#cdata-rcdata-restrictions
 * @see https://html.spec.whatwg.org/multipage/parsing.html#script-data-state
 * @see https://html.spec.whatwg.org/multipage/parsing.html#script-data-double-escaped-state
 * @see https://github.com/tc39/proposal-json-superset
 * @type {Record<string, string>}
 */
const render_json_payload_script_dict = {
	'<': '\\u003C',
	'\u2028': '\\u2028',
	'\u2029': '\\u2029'
};

const render_json_payload_script_regex = new RegExp(
	`[${Object.keys(render_json_payload_script_dict).join('')}]`,
	'g'
);

/**
 * Generates a raw HTML string containing a safe script element carrying JSON data and associated attributes.
 *
 * It escapes all the special characters needed to guarantee the element is unbroken, but care must
 * be taken to ensure it is inserted in the document at an acceptable position for a script element,
 * and that the resulting string isn't further modified.
 *
 * Attribute names must be type-checked so we don't need to escape them.
 *
 * @param {import('types').PayloadScriptAttributes} attrs A list of attributes to be added to the element.
 * @param {import('types').JSONValue} payload The data to be carried by the element. Must be serializable to JSON.
 * @returns {string} The raw HTML of a script element carrying the JSON payload.
 * @example const html = render_json_payload_script({ type: 'data', url: '/data.json' }, { foo: 'bar' });
 */
export function render_json_payload_script(attrs, payload) {
	const safe_payload = JSON.stringify(payload).replace(
		render_json_payload_script_regex,
		(match) => render_json_payload_script_dict[match]
	);

	let safe_attrs = '';
	for (const [key, value] of Object.entries(attrs)) {
		if (value === undefined) continue;
		safe_attrs += ` sveltekit:data-${key}=${escape_html_attr(value)}`;
	}

	return `<script type="application/json"${safe_attrs}>${safe_payload}</script>`;
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
