/**
 * Escapes characters that have special meaning in a regular expression.
 * @param {string} str
 * @returns {string} escaped string
 */
export function escape_for_regexp(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, (match) => '\\' + match);
}
