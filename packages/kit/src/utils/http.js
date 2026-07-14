import * as set_cookie_parser from 'set-cookie-parser';
import { BINARY_FORM_CONTENT_TYPE } from '../runtime/form-utils.js';

/**
 * Given an Accept header and a list of possible content types, pick
 * the most suitable one to respond with
 * @param {string} accept
 * @param {string[]} types
 */
export function negotiate(accept, types) {
	/** @type {Array<{ type: string, subtype: string, q: number, i: number }>} */
	const parts = [];

	accept.split(',').forEach((str, i) => {
		const match = /([^/ \t]+)\/([^; \t]+)[ \t]*(?:;[ \t]*q=([0-9.]+))?/.exec(str);

		// no match equals invalid header — ignore
		if (match) {
			const [, type, subtype, q = '1'] = match;
			parts.push({ type, subtype, q: +q, i });
		}
	});

	parts.sort((a, b) => {
		if (a.q !== b.q) {
			return b.q - a.q;
		}

		if ((a.subtype === '*') !== (b.subtype === '*')) {
			return a.subtype === '*' ? 1 : -1;
		}

		if ((a.type === '*') !== (b.type === '*')) {
			return a.type === '*' ? 1 : -1;
		}

		return a.i - b.i;
	});

	let accepted;
	let min_priority = Infinity;

	for (const mimetype of types) {
		const [type, subtype] = mimetype.split('/');
		const priority = parts.findIndex(
			(part) =>
				(part.type === type || part.type === '*') &&
				(part.subtype === subtype || part.subtype === '*')
		);

		if (priority !== -1 && priority < min_priority) {
			accepted = mimetype;
			min_priority = priority;
		}
	}

	return accepted;
}

/**
 * Reads all `Set-Cookie` headers as separate values. `Headers.get('set-cookie')`
 * collapses them into a single comma-joined string that browsers cannot parse, so
 * we use `Headers.getSetCookie()` where available and fall back to splitting the
 * joined string otherwise.
 *
 * TODO 3.0 `getSetCookie` is available in Node 19.7+; once we drop support for
 * older versions we can use it directly and remove the `splitCookiesString` fallback
 * @param {Headers} headers
 * @returns {string[]}
 */
export function get_set_cookies(headers) {
	if (typeof headers.getSetCookie === 'function') {
		return headers.getSetCookie();
	}

	const set_cookie = headers.get('set-cookie');
	return set_cookie ? set_cookie_parser.splitCookiesString(set_cookie) : [];
}

/**
 * Returns `true` if the request contains a `content-type` header with the given type
 * @param {Request} request
 * @param  {...string} types
 */
function is_content_type(request, ...types) {
	const type = request.headers.get('content-type')?.split(';', 1)[0].trim() ?? '';
	return types.includes(type.toLowerCase());
}

/**
 * @param {Request} request
 */
export function is_form_content_type(request) {
	// These content types must be protected against CSRF
	// https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/enctype
	return is_content_type(
		request,
		'application/x-www-form-urlencoded',
		'multipart/form-data',
		'text/plain',
		BINARY_FORM_CONTENT_TYPE
	);
}
