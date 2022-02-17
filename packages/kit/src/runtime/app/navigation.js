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

export const disableScrollHandling = import.meta.env.SSR
	? guard('disableScrollHandling')
	: disableScrollHandling_;
export const goto = import.meta.env.SSR ? guard('goto') : goto_;
export const invalidate = import.meta.env.SSR ? guard('invalidate') : invalidate_;
export const prefetch = import.meta.env.SSR ? guard('prefetch') : prefetch_;
export const prefetchRoutes = import.meta.env.SSR ? guard('prefetchRoutes') : prefetchRoutes_;
export const beforeNavigate = import.meta.env.SSR ? () => {} : beforeNavigate_;
export const afterNavigate = import.meta.env.SSR ? () => {} : afterNavigate_;

/**
 * @type {import('$app/navigation').goto}
 */
async function disableScrollHandling_() {
	renderer.disable_scroll_handling();
}

/**
 * @type {import('$app/navigation').goto}
 */
async function goto_(href, opts) {
	return router.goto(href, opts, []);
}

/**
 * @type {import('$app/navigation').invalidate}
 */
async function invalidate_(resource) {
	const { href } = new URL(resource, location.href);
	return router.renderer.invalidate(href);
}

/**
 * @type {import('$app/navigation').prefetch}
 */
async function prefetch_(href) {
	await router.prefetch(new URL(href, get_base_uri(document)));
}

/**
 * @type {import('$app/navigation').prefetchRoutes}
 */
async function prefetchRoutes_(pathnames) {
	const matching = pathnames
		? router.routes.filter((route) => pathnames.some((pathname) => route[0].test(pathname)))
		: router.routes;

	const promises = matching.map((r) => Promise.all(r[1].map((load) => load())));

	await Promise.all(promises);
}

/**
 * @type {import('$app/navigation').beforeNavigate}
 */
function beforeNavigate_(fn) {
	if (router) router.before_navigate(fn);
}

/**
 * @type {import('$app/navigation').afterNavigate}
 */
function afterNavigate_(fn) {
	if (router) router.after_navigate(fn);
}
