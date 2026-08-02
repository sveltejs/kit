/** @param {string} str */
export function posixify(str) {
	return str.replace(/\\/g, '/');
}
