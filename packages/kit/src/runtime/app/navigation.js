import { router, renderer } from '../client/singletons.js';
import { get_base_uri } from '../client/utils.js';
import { getContext } from 'svelte';

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
function prefetch_(href) {
	return router.prefetch(new URL(href, get_base_uri(document)));
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

/**
 * @param {RegExp} pattern
 * @param {string[]} params
 * @returns {string}
 */
function pathFromPattern(pattern, params) {
	let index = 0;
	return pattern.source
		.slice(1, -1)
		.replace(/\\\//g, '/')
		.replace(/\(\[\^\/\]\+\?\)/g, () => params[index++])
		.replace(/\/\?$/, '');
}

/**
 * @param {any} value
 * @return {value is import('types/internal').SSRPage}
 */
function isSSRPage(value) {
	return typeof value === 'object' && value.type === 'page';
}

/**
 * @type {import('$app/navigation').alternates}
 */
export function alternates(href) {
	if (!import.meta.env.SSR && router) {
		const hrefRoute = router.routes?.find((route) => route && route[0].test(href));
		if (!hrefRoute) return [];
		const match = href.match(hrefRoute[0]);
		const params = match ? match.slice(1) : [];
		const alternates = router.routes.filter((route) => route && route[4] === hrefRoute[4]);
		return alternates.map((route) => pathFromPattern(route[0], params));
	} else {
		/** @type {import('types/internal').SSRRoute[]} */
		const routes = getContext('__svelte_routes__');
		const hrefRoute = routes.find((route) => route.pattern.test(href));
		if (!hrefRoute || !isSSRPage(hrefRoute)) return [];
		const match = href.match(hrefRoute.pattern);
		const params = match ? match.slice(1) : [];
		const alternates = routes.filter((route) => isSSRPage(route) && route.id === hrefRoute.id);
		return alternates.map((route) => pathFromPattern(route.pattern, params));
	}
}
