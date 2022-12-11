import { BROWSER } from 'esm-env';
import { client } from '../client/singletons.js';

/**
 * @param {string} name
 */
function guard(name) {
	return () => {
		throw new Error(`Cannot call ${name}(...) on the server`);
	};
}

export const disableScrollHandling = BROWSER
	? client.disable_scroll_handling
	: guard('disableScrollHandling');
export const goto = BROWSER ? client.goto : guard('goto');
export const invalidate = BROWSER ? client.invalidate : guard('invalidate');
export const invalidateAll = BROWSER ? client.invalidateAll : guard('invalidateAll');
export const preloadData = BROWSER ? client.preload_data : guard('preloadData');
export const preloadCode = BROWSER ? client.preload_code : guard('preloadCode');
export const beforeNavigate = BROWSER ? client.before_navigate : () => {};
export const afterNavigate = BROWSER ? client.after_navigate : () => {};

// TODO remove for 1.0 release
/** @param {any} _args */
export const prefetch = (..._args) => {
	throw new Error('prefetch has been renamed to preloadData');
};
/** @param {any} _args */
export const prefetchRoutes = (..._args) => {
	throw new Error('prefetchRoutes has been renamed to preloadCode');
};
