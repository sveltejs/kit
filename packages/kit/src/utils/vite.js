// this file needs to be runtime agnostic and avoid importing from `node:*` since
// it may not be available in edge environments
import { posixify } from './os.js';

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

/**
 * From magic-string/src/utils/getLocator.ts
 * @param {string} source
 */
export function get_locator(source) {
	const line_offsets = [0];
	for (let i = source.indexOf('\n'); i !== -1; i = source.indexOf('\n', i + 1))
		line_offsets.push(i + 1);
	/** @param {number} index */
	return function locate(index) {
		let i = 0;
		let j = line_offsets.length;
		while (i < j) {
			const m = (i + j) >> 1;
			if (index < line_offsets[m]) j = m;
			else i = m + 1;
		}
		const line = i - 1;
		return {
			line,
			column: index - line_offsets[line]
		};
	};
}
