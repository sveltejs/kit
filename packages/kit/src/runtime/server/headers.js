/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { RequestState } from 'types' */
import { DEV } from 'esm-env';
import { validateHeaders } from './validate-headers.js';
import * as e from '../../messages/server-errors.js';

/**
 * Creates `event.setHeaders`, which collects headers into `state.headers`
 * @param {RequestState} state
 * @returns {RequestEvent['setHeaders']}
 */
export function create_set_headers(state) {
	const { headers } = state;

	return (new_headers) => {
		if (DEV) {
			validateHeaders(new_headers);
		}

		for (const key in new_headers) {
			const lower = key.toLowerCase();
			const value = new_headers[key];

			if (lower === 'set-cookie') {
				e.set_headers_cookie();
			} else if (lower in headers) {
				// appendHeaders-style for Server-Timing https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Server-Timing
				if (lower === 'server-timing') {
					headers[lower] += ', ' + value;
				} else {
					e.header_already_set({ name: key });
				}
			} else {
				headers[lower] = value;

				if (state.prerendering && lower === 'cache-control') {
					state.prerendering.cache = /** @type {string} */ (value);
				}
			}
		}
	};
}
