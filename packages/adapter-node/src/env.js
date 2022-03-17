/* global ENV_PREFIX */

/**
 * @param {string} name
 * @param {any} fallback
 */
export function env(name, fallback) {
	const prefixed = ENV_PREFIX + name;
	return prefixed in process.env ? process.env[prefixed] : fallback;
}
