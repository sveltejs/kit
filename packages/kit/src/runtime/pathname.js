import { base, app_dir } from '__sveltekit/paths';

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

const ROUTE_PREFIX = `${base}/${app_dir}/route`;

/**
 * @param {string} pathname
 * @returns {boolean}
 */
export function has_resolution_prefix(pathname) {
	return pathname === `${ROUTE_PREFIX}.js` || pathname.startsWith(`${ROUTE_PREFIX}/`);
}

/**
 * Convert a regular URL to a route to send to SvelteKit's server-side route resolution endpoint
 * @param {string} pathname
 * @returns {string}
 */
export function add_resolution_prefix(pathname) {
	let normalized = pathname.slice(base.length);
	if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);

	return `${ROUTE_PREFIX}${normalized}.js`;
}

/**
 * @param {string} pathname
 * @returns {string}
 */
export function strip_resolution_prefix(pathname) {
	return base + (pathname.slice(ROUTE_PREFIX.length, -3) || '/');
}
