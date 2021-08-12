import { router } from '../client/singletons.js';
import { get_base_uri } from '../client/utils.js';

/**
 * @typedef {import('../client/router').Router} Router
 */

/**
 * @param {string} name
 */
function guard(name) {
	return () => {
		throw new Error(`Cannot call ${name}(...) on the server`);
	};
}

export const goto = import.meta.env.SSR ? guard('goto') : goto_;
export const invalidate = import.meta.env.SSR ? guard('invalidate') : invalidate_;
export const prefetch = import.meta.env.SSR ? guard('prefetch') : prefetch_;
export const prefetchRoutes = import.meta.env.SSR ? guard('prefetchRoutes') : prefetchRoutes_;

/**
 * @type {import('$app/navigation').goto}
 */
async function goto_(href, opts) {
	return /** @type {Router} */ (router).goto(href, opts, []);
}

/**
 * @type {import('$app/navigation').invalidate}
 */
async function invalidate_(resource) {
	const { href } = new URL(resource, location.href);
	return /** @type {Router} */ (router).renderer.invalidate(href);
}

/**
 * @type {import('$app/navigation').prefetch}
 */
function prefetch_(href) {
	return /** @type {Router} */ (router).prefetch(new URL(href, get_base_uri(document)));
}

/**
 * @type {import('$app/navigation').prefetchRoutes}
 */
async function prefetchRoutes_(pathnames) {
	const matching = pathnames
		? /** @type {Router} */ (router).routes.filter((route) =>
				pathnames.some((pathname) => route[0].test(pathname))
		  )
		: /** @type {Router} */ (router).routes;

	const promises = matching
		.filter((r) => r && r.length > 1)
		.map((r) =>
			Promise.all(/** @type {import('types/internal').CSRPage} */ (r)[1].map((load) => load()))
		);

	await Promise.all(promises);
}
