import { app_dir, base } from '#app/paths';
import { add_resolution_suffix } from '../pathname.js';

export * from '../pathname.js';

const ROUTES_PREFIX = '/routes';

/**
 * The pathname of the route-ID-keyed resolution module for a given route ID,
 * e.g. `/_app/routes/blog/[slug]/__route.js` (before prefixing with `base`).
 * @param {string} route_id
 * @returns {string}
 */
export function route_id_resolution_pathname(route_id) {
	return add_resolution_suffix(`/${app_dir}${ROUTES_PREFIX}${route_id === '/' ? '' : route_id}`);
}

/**
 * Whether a pathname (with the `/__route.js` suffix already stripped, and `base` NOT yet stripped)
 * is a route-ID resolution request rather than a pathname resolution request.
 * @param {string} pathname
 * @returns {boolean}
 */
export function is_route_id_resolution_path(pathname) {
	const prefix = `${base}/${app_dir}${ROUTES_PREFIX}`;
	return pathname === prefix || pathname.startsWith(prefix + '/');
}

/**
 * Extract the route ID from a decoded, base-stripped, suffix-stripped pathname,
 * e.g. `/_app/routes/blog/[slug]` -> `/blog/[slug]`, `/_app/routes` -> `/`.
 * @param {string} pathname
 * @returns {string}
 */
export function extract_route_id(pathname) {
	return pathname.slice(`/${app_dir}${ROUTES_PREFIX}`.length) || '/';
}
