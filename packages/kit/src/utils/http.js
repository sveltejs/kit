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
		const match = /^[ \t]*([^/ \t]+)\/([^; \t]+)[ \t]*(?:;[ \t]*q=([0-9.]+))?/.exec(str);

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
 * Returns `true` if a `content-type` header value is one of the given types, ignoring
 * parameters such as `charset` and comparing case-insensitively
 * @param {string | null | undefined} header
 * @param  {...string} types
 */
export function matches_content_type(header, ...types) {
	const type = header?.split(';', 1)[0].trim() ?? '';
	return types.includes(type.toLowerCase());
}

/**
 * @param {Request} request
 */
export function is_form_content_type(request) {
	// These content types must be protected against CSRF
	// https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/enctype
	return matches_content_type(
		request.headers.get('content-type'),
		'application/x-www-form-urlencoded',
		'multipart/form-data',
		'text/plain',
		BINARY_FORM_CONTENT_TYPE
	);
}
