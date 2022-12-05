import { SSR } from '@sveltejs/environment';
import { client } from '../client/singletons.js';

/**
 * @param {string} name
 */
function guard(name) {
	return () => {
		throw new Error(`Cannot call ${name}(...) on the server`);
	};
}

export const disableScrollHandling = SSR
	? guard('disableScrollHandling')
	: client.disable_scroll_handling;
export const goto = SSR ? guard('goto') : client.goto;
export const invalidate = SSR ? guard('invalidate') : client.invalidate;
export const invalidateAll = SSR ? guard('invalidateAll') : client.invalidateAll;
export const preloadData = SSR ? guard('preloadData') : client.preload_data;
export const preloadCode = SSR ? guard('preloadCode') : client.preload_code;
export const beforeNavigate = SSR ? () => {} : client.before_navigate;
export const afterNavigate = SSR ? () => {} : client.after_navigate;

// TODO remove for 1.0 release
/** @param {any} _args */
export const prefetch = (..._args) => {
	throw new Error('prefetch has been renamed to preloadData');
};
/** @param {any} _args */
export const prefetchRoutes = (..._args) => {
	throw new Error('prefetchRoutes has been renamed to preloadCode');
};
