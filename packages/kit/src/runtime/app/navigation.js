import { router } from '../client/singletons.js';
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
export const invalidate = import.meta.env.SSR ? guard('invalidate') : invalidate_;
export const prefetch = import.meta.env.SSR ? guard('prefetch') : prefetch_;
export const prefetchRoutes = import.meta.env.SSR ? guard('prefetchRoutes') : prefetchRoutes_;
export const switchLocalePath = import.meta.env.SSR ? guard('switchLocalePath') : switchLocalePath_;
export const i18nRoute = import.meta.env.SSR ? guard('i18nRoute') : i18nRoute_;

/**
 * @type {import('$app/navigation').goto}
 */
async function goto_(href, opts) {
	// @ts-expect-error
	return router.goto(href, opts, []);
}

/**
 * @type {import('$app/navigation').invalidate}
 */
async function invalidate_(resource) {
	const { href } = new URL(resource, location.href);
	// @ts-expect-error
	return router.renderer.invalidate(href);
}

/**
 * @type {import('$app/navigation').prefetch}
 */
function prefetch_(href) {
	// @ts-expect-error
	return router.prefetch(new URL(href, get_base_uri(document)));
}

/**
 * @type {import('$app/navigation').prefetchRoutes}
 */
async function prefetchRoutes_(pathnames) {
	const matching = pathnames
		? // @ts-expect-error
		  router.routes.filter((route) => pathnames.some((pathname) => route[0].test(pathname)))
		: // @ts-expect-error
		  router.routes;

	const promises = matching
		.filter((r) => r && r.length > 1)
		// @ts-expect-error
		.map((r) => Promise.all(r[1].map((load) => load())));

	await Promise.all(promises);
}

/**
 * @type {import('$app/navigation').switchLocalePath}
 */
function switchLocalePath_(lang) {
	// @ts-expect-error
	return router.switchLocalePath(lang);
}

/**
 * @type {import('$app/navigation').i18nRoute}
 */
function i18nRoute_(route) {
	// @ts-expect-error
	return router.i18nRoute(route);
}
