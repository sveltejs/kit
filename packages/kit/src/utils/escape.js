/** @type {Record<string, string>} */
const escaped = {
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
function escape(str) {
	let result = '';

	for (let i = 0; i < str.length; i += 1) {
		const char = str.charAt(i);
		const code = char.charCodeAt(0);

		if (char === '"') {
			result += '\\"';
		} else if (char in escaped) {
			result += escaped[char];
		} else if (code >= 0xd800 && code <= 0xdfff) {
			const next = str.charCodeAt(i + 1);

			// If this is the beginning of a [high, low] surrogate pair,
			// add the next two characters, otherwise escape
			if (code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) {
				result += char + str[++i];
			} else {
				result += `\\u${code.toString(16).toUpperCase()}`;
			}
		} else {
			result += char;
		}
	}

	return result;
}

/**
 * use for escaping string values to be used in json content embedded into script tags on the page
 * e.g.
 * <script data-svelte>
 *   {"somekey": "here" }
 * </script>
 * @param {string} str
 * @returns string escaped string
 */
export function escape_json_in_html(str) {
	return escape(str);
}

/**
 * use for escaping ALL strings in obj to be used in json content embedded into script tags on the page
 * e.g.
 * <script data-svelte>
 *   {"here": "andhere","heretoo":1 }
 * </script>
 * @param {string} str literal json string
 * @returns string escaped json
 */
export function escape_json_literal_in_html(str) {
	return JSON.stringify(JSON.parse(str, reviver_escape_json));
}

/**
 *
 * @param key {string}
 * @param value {*}
 * @returns {string|*}
 */
function reviver_escape_json(key, value) {
	const escaped_key = escape_json_in_html(key);
	const escaped_value = typeof value === 'string' ? escape_json_in_html(value) : value;
	if (escaped_key === key) {
		return escaped_value;
	} else {
		// @ts-ignore
		if (Object.prototype.hasOwnProperty.call(this, escaped_key) && this[escaped_key] !== value) {
			// @ts-ignore
			throw new Error(
				`encountered object with invalid key and escaped key with different value: "${key}":"${value}", "${escaped_key}":"${this[escaped_key]}"`
			);
		}
		// @ts-ignore
		this[escaped_key] = escaped_value;
	}
}

/**
 * use for escaping string values to be used html attributes on the page
 * e.g.
 * <script data-url="here">
 * @param {string} str
 * @returns string escaped string
 */
export function escape_html_attr(str) {
	return escape(str);
}
