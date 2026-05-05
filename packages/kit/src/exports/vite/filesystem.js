// this file needs to be runtime agnostic and avoid importing from `node:*` since
// it may not be available in edge environments

import { posixify } from '../../utils/os.js';

/**
 * Prepend given path with `/@fs` prefix
 * @param {string} str
 */
export function to_fs(str) {
	str = posixify(str);
	return `/@fs${
		// Windows/Linux separation - Windows starts with a drive letter, we need a / in front there
		str.startsWith('/') ? '' : '/'
	}${str}`;
}

/**
 * Removes `/@fs` prefix from given path and posixifies it
 * @param {string} str
 */
export function from_fs(str) {
	str = posixify(str);
	if (!str.startsWith('/@fs')) return str;

	str = str.slice(4);
	// Windows/Linux separation - Windows starts with a drive letter, we need to strip the additional / here
	return str[2] === ':' && /[A-Z]/.test(str[1]) ? str.slice(1) : str;
}
