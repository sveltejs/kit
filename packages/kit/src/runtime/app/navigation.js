import { router, renderer } from '../internal/singletons';
import { get_base_uri } from '../internal/utils';

/**
 * @param {string} href
 * @param {{
 *   noscroll?: boolean;
 *   resplaceState?: boolean;
 * }} [opts]
 */
export async function goto(href, opts) {
	return router.goto(href, opts, []);
}

/** @param {string} href */
export function prefetch(href) {
	return renderer.prefetch(new URL(href, get_base_uri(document)));
}

/** @param {string[]} [pathnames] */
export async function prefetchRoutes(pathnames) {
	const path_routes = pathnames
		? router.pages.filter((page) => pathnames.some((pathname) => page.pattern.test(pathname)))
		: router.pages;

	const promises = path_routes.map((r) => Promise.all(r.parts.map((load) => load())));

	await Promise.all(promises);
}
