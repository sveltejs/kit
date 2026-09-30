/** @import { RequestState } from 'types' */
import { DEV } from 'esm-env';
import { validateHeaders } from './validate-headers.js';

/**
 * Collects the headers set with `setHeaders`. Headers set while a page renders are held
 * back until the page commits or discards them, so a failed render leaves nothing behind
 * @param {RequestState} state
 */
export function create_headers(state) {
	/** @type {Record<string, string>} */
	const headers = {};

	/** @type {Record<string, string> | null} */
	let held = null;

	return {
		/** @param {Record<string, string>} new_headers */
		set(new_headers) {
			if (DEV) {
				validateHeaders(new_headers);
			}

			const target = held ?? headers;

			for (const key in new_headers) {
				const lower = key.toLowerCase();
				const value = new_headers[key];

				if (lower === 'set-cookie') {
					throw new Error(
						'Use `event.cookies.set(name, value, options)` instead of `event.setHeaders` to set cookies'
					);
				} else if (lower in headers || (held !== null && lower in held)) {
					// appendHeaders-style for Server-Timing https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Server-Timing
					if (lower === 'server-timing') {
						target[lower] = lower in target ? target[lower] + ', ' + value : value;
					} else {
						throw new Error(`"${key}" header is already set`);
					}
				} else {
					target[lower] = value;

					if (state.prerendering && lower === 'cache-control') {
						state.prerendering.cache = value;
					}
				}
			}
		},

		hold() {
			held = {};
		},

		commit() {
			if (held === null) return;

			// only server-timing can already be set, everything else threw in `set`
			for (const key in held) {
				headers[key] = key in headers ? headers[key] + ', ' + held[key] : held[key];
			}

			held = null;
		},

		discard() {
			held = null;
		},

		/** @param {Headers} target */
		apply(target) {
			for (const key in headers) {
				target.set(key, headers[key]);
			}
		}
	};
}
