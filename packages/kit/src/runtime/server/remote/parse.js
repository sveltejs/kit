/** @import { RequestEvent } from '@sveltejs/kit' */

import { SvelteKitError } from '@sveltejs/kit/internal';
import { is_form_content_type } from '../../../utils/http.js';

/**
 * Asserts that the request uses the HTTP method required by the remote function type.
 * @param {RequestEvent} event
 * @param {'GET' | 'POST'} expected
 * @param {string} label the remote function type, e.g. `query.live` (backticks are added automatically)
 * @returns {void}
 */
export function assert_method(event, expected, label) {
	if (event.request.method !== expected) {
		throw new SvelteKitError(
			405,
			'Method Not Allowed',
			`\`${label}\` functions must be invoked via ${expected} request, not ${event.request.method}`
		);
	}
}

/**
 * Asserts that a `form` request carries form-encoded data.
 * @param {RequestEvent} event
 * @returns {void}
 */
export function assert_form_content_type(event) {
	if (!is_form_content_type(event.request)) {
		throw new SvelteKitError(
			415,
			'Unsupported Media Type',
			`\`form\` functions expect form-encoded data — received ${event.request.headers.get(
				'content-type'
			)}`
		);
	}
}

/**
 * Reads the `payload` search param from a remote function request. A `new URL`
 * is constructed because the URL in `event` is hidden inside remote functions.
 * @param {RequestEvent} event
 * @returns {string}
 */
export function get_payload(event) {
	return /** @type {string} */ (new URL(event.request.url).searchParams.get('payload'));
}
