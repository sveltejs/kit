import { client } from '../client/singletons.js';

/**
 * @param {string} name
 */
function guard(name) {
	return () => {
		throw new Error(`Cannot call ${name}(...) on the server`);
	};
}

const ssr = import.meta.env.SSR;

export const disableScrollHandling = ssr
	? guard('disableScrollHandling')
	: client.disable_scroll_handling;
export const goto = ssr ? guard('goto') : client.goto;
export const invalidate = ssr ? guard('invalidate') : client.invalidate;
export const invalidateAll = ssr ? guard('invalidateAll') : client.invalidateAll;
export const preloadData = ssr ? guard('preloadData') : client.preload_data;
export const preloadCode = ssr ? guard('preloadCode') : client.preload_code;
export const beforeNavigate = ssr ? () => {} : client.before_navigate;
export const afterNavigate = ssr ? () => {} : client.after_navigate;

// TODO remove for 1.0 release
/** @param {any} _args */
export const prefetch = (..._args) => {
	throw new Error('prefetch has been renamed to preloadData');
};
/** @param {any} _args */
export const prefetchRoutes = (..._args) => {
	throw new Error('prefetchRoutes has been renamed to preloadCode');
};
