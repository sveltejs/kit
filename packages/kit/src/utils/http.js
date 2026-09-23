import { BINARY_FORM_CONTENT_TYPE } from '../runtime/form-utils.js';

/**
 * Parses an Accept header into its media ranges, most preferred first
 * @param {string} accept
 */
function parse_accept(accept) {
	/** @type {Array<{ type: string, subtype: string, q: number, i: number }>} */
	const parts = [];

	accept.split(',').forEach((str, i) => {
		const match = /^[ \t]*([^/ \t]+)\/([^; \t]+)/.exec(str);

		// no match equals invalid header — ignore
		if (match) {
			const [, type, subtype] = match;
			// the quality can follow other parameters, e.g. `application/json;charset=utf-8;q=0.5`
			const q = /;[ \t]*q=([0-9.]+)/.exec(str)?.[1] ?? '1';
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

	return parts;
}

/**
 * Given an Accept header and a list of possible content types, pick
 * the most suitable one to respond with
 * @param {string} accept
 * @param {string[]} types
 */
export function negotiate(accept, types) {
	const parts = parse_accept(accept);

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
 * Returns `true` if an Accept header prioritises `text/html`, meaning it names `text/html`
 * (or `text/*`) with a quality at least as high as any other media range in the header,
 * as browsers do when navigating to a page. A header that only accepts HTML through a
 * catch-all wildcard, or ranks another type above it, does not.
 * @param {string} accept
 */
export function prefers_html(accept) {
	const parts = parse_accept(accept);

	const html = parts.find(
		(part) => part.type === 'text' && (part.subtype === 'html' || part.subtype === '*')
	);

	// parts are sorted by quality, highest first
	return html !== undefined && html.q === parts[0].q;
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
