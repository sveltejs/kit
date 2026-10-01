// this file needs to remain node-agnostic because it could be imported into an
// environment without access to `node:*`

/** @param {string} str */
export function posixify(str) {
	return str.replace(/\\/g, '/');
}
