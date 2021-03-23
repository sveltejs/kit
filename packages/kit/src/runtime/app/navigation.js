import { router, renderer } from '../client/singletons.js';
import { get_base_uri } from '../client/utils.js';

/**
 * @param {string} name
 */
function guard(name) {
	return () => {
		throw new Error(`Cannot call ${name}(...) on the server`);
	};
}

export const goto = import.meta.env.SSR ? guard('goto') : goto_;
export const prefetch = import.meta.env.SSR ? guard('prefetch') : prefetch_;
export const prefetchRoutes = import.meta.env.SSR ? guard('prefetchRoutes') : prefetchRoutes_;

/**
 * @param {string} href
 * @param {{
 *   noscroll?: boolean;
 *   resplaceState?: boolean;
 * }} [opts]
 */
async function goto_(href, opts) {
	return router.goto(href, opts, []);
}

/** @param {string} href */
function prefetch_(href) {
	return renderer.prefetch(new URL(href, get_base_uri(document)));
}

/** @param {string[]} [pathnames] */
async function prefetchRoutes_(pathnames) {
	const matching = pathnames
		? router.routes.filter((route) => pathnames.some((pathname) => route[0].test(pathname)))
		: router.routes;

	const promises = matching.map((r) => r.length !== 1 && Promise.all(r[1].map((load) => load())));

	await Promise.all(promises);
}
