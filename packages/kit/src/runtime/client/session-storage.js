/**
 * Read a value from `sessionStorage`
 * @param {string} key
 */
export function get(key) {
	try {
		return JSON.parse(sessionStorage[key]);
	} catch {
		// do nothing
	}
}

/**
 * Write a value to `sessionStorage`
 * @param {string} key
 * @param {any} value
 */
export function set(key, value) {
	const json = JSON.stringify(value);
	try {
		sessionStorage[key] = json;
	} catch {
		// do nothing
	}
}
