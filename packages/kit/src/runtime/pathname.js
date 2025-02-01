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

/**
 * Convert a regular URL to a route to send to SvelteKit's server-side route resolution endpoint
 * @param {string} pathname
 * @param {string} base
 * @param {string} app_dir
 * @returns {string}
 */
export function add_resolution_prefix(pathname, base, app_dir) {
	let normalized = pathname.slice(base.length);
	if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);

	return `${base}/${app_dir}/route${normalized}.js`;
}
