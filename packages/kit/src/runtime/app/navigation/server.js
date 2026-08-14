import { noop } from '../../../utils/functions.js';

export const afterNavigate = noop;
export const beforeNavigate = noop;
export const disableScrollHandling = disallow('disableScrollHandling', '()');
export const goto = disallow('goto');
export const invalidate = disallow('invalidate');
export const invalidateAll = disallow('invalidateAll', '()');
export const onNavigate = noop;
export const refreshAll = disallow('refreshAll', '()');
export const preloadCode = disallow('preloadCode');
export const preloadData = disallow('preloadData');
export const pushState = disallow('pushState');
export const replaceState = disallow('replaceState');
export const snapshot = noop;

/**
 * @param {string} name
 * @param {string} [parens]
 */
function disallow(name, parens = '(...)') {
	return () => {
		throw new Error(`Cannot call \`${name}${parens}\` on the server`);
	};
}
