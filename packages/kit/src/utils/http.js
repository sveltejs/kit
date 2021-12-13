import { Headers } from 'node-fetch';

/**
 * @param {Record<string, string | string[]>} headers
 * @param {string} key
 * @returns {string | undefined}
 * @throws {Error}
 */
export function get_single_valued_header(headers, key) {
	const value = headers[key];
	if (Array.isArray(value)) {
		if (value.length === 0) {
			return undefined;
		}
		if (value.length > 1) {
			throw new Error(
				`Multiple headers provided for ${key}. Multiple may be provided only for set-cookie`
			);
		}
		return value[0];
	}
	return value;
}

/**
 * Ensure that the headers are represented as an instance of the Headers class,
 * not an object or an array.
 *
 * @param {HeadersInit} headers
 * @returns {Headers}
 */
export function ensure_headers_class(headers) {
	if ('has' in headers && typeof headers.has === 'function') {
		// `headers` is probably a WHATWG-compliant implementation of headers
		return /** @type {Headers} */ (headers);
	} else {
		return new Headers(headers);
	}
}

/**
 * Ensure that the headers are represented as a plain object,
 * not a `Headers` instance or an array.
 *
 * @param {HeadersInit} headers
 * @returns {Record<string, string>}
 */
export function ensure_headers_plain_object(headers) {
	if ('has' in headers && typeof headers.has === 'function') {
		// `headers` is probably a WHATWG-compliant implementation of headers
		return Object.fromEntries([.../** @type {Headers} */ (headers)]);
	} else if (Array.isArray(headers)) {
		return Object.fromEntries(headers);
	} else {
		return /** @type {Record<string, string>} */ (headers);
	}
}

/**
 * Clone a WHATWG-compliant implementation of headers.
 *
 * @param {Headers} headers
 * @returns {Headers}
 */
export function clone_headers(headers) {
	const headersClone = new Headers();
	for (const [header, value] of headers) {
		headersClone.append(header, value);
	}
	return headersClone;
}
