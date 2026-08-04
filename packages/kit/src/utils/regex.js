/**
 * Escapes characters that have special meaning in a regular expression.
 * @param {string} str
 * @returns {string} escaped string
 */
export function escape_for_regexp(str) {
	// TODO replace with `RegExp.escape(str)` when we require Node >= 24
	return str.replace(/[.*+?^${}()|[\]\\]/g, (match) => '\\' + match);
}
