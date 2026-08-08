const DATA_SUFFIX = '/__data.json';
const HTML_DATA_SUFFIX = '.html__data.json';

/** @param {string} pathname */
export function has_data_suffix(pathname) {
	return pathname.endsWith(DATA_SUFFIX) || pathname.endsWith(HTML_DATA_SUFFIX);
}

/** @param {string} pathname */
export function add_data_suffix(pathname) {
	if (pathname.endsWith('.html')) return pathname.replace(/\.html$/, HTML_DATA_SUFFIX);
	return pathname.replace(/\/$/, '') + DATA_SUFFIX;
}

/** @param {string} pathname */
export function strip_data_suffix(pathname) {
	if (pathname.endsWith(HTML_DATA_SUFFIX)) {
		return pathname.slice(0, -HTML_DATA_SUFFIX.length) + '.html';
	}

	return pathname.slice(0, -DATA_SUFFIX.length);
}

const ROUTE_SUFFIX = '/__route.js';
const HTML_ROUTE_SUFFIX = '.html__route.js';

/**
 * @param {string} pathname
 * @returns {boolean}
 */
export function has_resolution_suffix(pathname) {
	return pathname.endsWith(ROUTE_SUFFIX) || pathname.endsWith(HTML_ROUTE_SUFFIX);
}

/**
 * Convert a regular URL to a route to send to SvelteKit's server-side route resolution endpoint
 * @param {string} pathname
 * @returns {string}
 */
export function add_resolution_suffix(pathname) {
	if (pathname.endsWith('.html')) return pathname.replace(/\.html$/, HTML_ROUTE_SUFFIX);
	return pathname.replace(/\/$/, '') + ROUTE_SUFFIX;
}

/**
 * @param {string} pathname
 * @returns {string}
 */
export function strip_resolution_suffix(pathname) {
	if (pathname.endsWith(HTML_ROUTE_SUFFIX)) {
		return pathname.slice(0, -HTML_ROUTE_SUFFIX.length) + '.html';
	}

	return pathname.slice(0, -ROUTE_SUFFIX.length);
}

const ROUTES_PREFIX = '/routes';

/**
 * The pathname of the route-ID-keyed resolution module for a given route ID,
 * e.g. `/_app/routes/blog/[slug]/__route.js` (before prefixing with `base`).
 * @param {string} app_dir
 * @param {string} route_id
 * @returns {string}
 */
export function route_id_resolution_pathname(app_dir, route_id) {
	return add_resolution_suffix(`/${app_dir}${ROUTES_PREFIX}${route_id === '/' ? '' : route_id}`);
}

/**
 * Whether a pathname (with the `/__route.js` suffix already stripped, and `base` NOT yet stripped)
 * is a route-ID resolution request rather than a pathname resolution request.
 * @param {string} pathname
 * @param {string} base
 * @param {string} app_dir
 * @returns {boolean}
 */
export function is_route_id_resolution_path(pathname, base, app_dir) {
	const prefix = `${base}/${app_dir}${ROUTES_PREFIX}`;
	return pathname === prefix || pathname.startsWith(prefix + '/');
}

/**
 * Extract the route ID from a decoded, base-stripped, suffix-stripped pathname,
 * e.g. `/_app/routes/blog/[slug]` -> `/blog/[slug]`, `/_app/routes` -> `/`.
 * @param {string} pathname
 * @param {string} app_dir
 * @returns {string}
 */
export function extract_route_id(pathname, app_dir) {
	return pathname.slice(`/${app_dir}${ROUTES_PREFIX}`.length) || '/';
}
