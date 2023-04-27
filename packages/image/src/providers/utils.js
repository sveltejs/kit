/**
 * @param {URL} url
 */
export function relative_url(url) {
	const { pathname, search } = url;
	return `${pathname}${search}`;
}
/**
 * @param {URL} url
 * @param {string} param
 * @param {any} value
 * @param {boolean} [override]
 */
export function set_param(url, param, value, override = true) {
	if (value === undefined) {
		return;
	}

	if (value === null) {
		if (override || url.searchParams.has(param)) {
			url.searchParams.delete(param);
		}
	} else {
		if (override || !url.searchParams.has(param)) {
			url.searchParams.set(param, value);
		}
	}
}
