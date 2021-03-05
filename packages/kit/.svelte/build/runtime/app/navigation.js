import { router, renderer } from '../internal/singletons.js';
import { g as get_base_uri } from '../chunks/utils.js';

/**
 * @param {string} href
 * @param {{
 *   noscroll?: boolean;
 *   resplaceState?: boolean;
 * }} [opts]
 */
async function goto(href, opts) {
	return router.goto(href, opts);
}

/** @param {string} href */
function prefetch(href) {
	return renderer.prefetch(new URL(href, get_base_uri(document)));
}

/** @param {string[]} [pathnames] */
async function prefetchRoutes(pathnames) {
	const path_routes = pathnames
		? router.pages.filter((page) => pathnames.some((pathname) => page.pattern.test(pathname)))
		: router.pages;

	const promises = path_routes.map((r) => Promise.all(r.parts.map((load) => load())));

	await Promise.all(promises);
}

export { goto, prefetch, prefetchRoutes };
//# sourceMappingURL=navigation.js.map
