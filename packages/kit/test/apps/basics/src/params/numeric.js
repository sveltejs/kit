/**
 * @param {string} param
 * @returns {param is number}
 */
export function match(param) {
	return !isNaN(parseInt(param));
}
