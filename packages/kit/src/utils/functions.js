import * as e from '../messages/server-errors.js';

export function noop() {}

/**
 * @template T
 * @param {() => T} fn
 */
export function once(fn) {
	let done = false;

	/** @type T */
	let result;

	return () => {
		if (done) return result;
		done = true;
		return (result = fn());
	};
}

/**
 * @param {string} name
 * @param {string} [parens]
 */
export function disallow_on_server(name, parens = '(...)') {
	return () => {
		e.server_api_unavailable({ name: `${name}${parens}` });
	};
}
