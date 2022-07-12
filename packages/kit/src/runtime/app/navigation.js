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
export const prefetch = ssr ? guard('prefetch') : client.prefetch;
export const prefetchRoutes = ssr ? guard('prefetchRoutes') : client.prefetch_routes;
export const beforeNavigate = ssr ? () => {} : client.before_navigate;
export const afterNavigate = ssr ? () => {} : client.after_navigate;
