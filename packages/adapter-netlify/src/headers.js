import * as set_cookie_parser from 'set-cookie-parser';

/**
 * Splits headers into two categories: single value and multi value
 * @param {Headers} headers
 * @returns {{
 *   headers: Record<string, string>,
 *   multiValueHeaders: Record<string, string[]>
 * }}
 */
export function split_headers(headers) {
	/** @type {Record<string, string>} */
	const h = {};

	/** @type {Record<string, string[]>} */
	const m = {};

	headers.forEach((value, key) => {
		if (key === 'set-cookie') {
			m[key] = set_cookie_parser.splitCookiesString(value);
		} else {
			h[key] = value;
		}
	});

	return {
		headers: h,
		multiValueHeaders: m
	};
}
