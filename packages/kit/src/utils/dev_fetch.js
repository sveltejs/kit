import * as e from '../messages/server-errors.js';
import { SCHEME } from './url.js';

const patched = Symbol.for('sveltekit.dev.fetch');

/**
 * Makes the global `fetch` reject relative URLs during development, which
 * cannot be resolved on the server
 */
export function patch_fetch() {
	const fetch = globalThis.fetch;

	// the module that calls this can be evaluated more than once
	if (patched in fetch) return;

	globalThis.fetch = Object.assign(
		/** @type {typeof globalThis.fetch} */ (
			(info, init) => {
				if (typeof info === 'string' && !SCHEME.test(info)) {
					e.fetch_relative_url({ url: info });
				}

				return fetch(info, init);
			}
		),
		{ [patched]: true }
	);
}
