import { writable } from 'svelte/store';
import { create_updated_store, notifiable_store } from './utils.js';
import { BROWSER } from 'esm-env';

/** @type {import('./types').Client} */
export let client;

/**
 * @param {{
 *   client: import('./types').Client;
 * }} opts
 */
export function init(opts) {
	client = opts.client;
}

/**
 * @template {keyof typeof client} T
 * @param {T} key
 * @returns {typeof client[T]}
 */
export function client_method(key) {
	if (!BROWSER) {
		if (key === 'before_navigate' || key === 'after_navigate') {
			// @ts-expect-error doesn't recognize that both keys here return void so expects a async function
			return () => {};
		} else {
			/** @type {Record<string, string>} */
			const name_lookup = {
				disable_scroll_handling: 'disableScrollHandling',
				preload_data: 'preloadData',
				preload_code: 'preloadCode',
				invalidate_all: 'invalidateAll'
			};

			return () => {
				throw new Error(`Cannot call ${name_lookup[key] ?? key}(...) on the server`);
			};
		}
	} else {
		// @ts-expect-error
		return (...args) => client[key](...args);
	}
}

export const stores = {
	url: notifiable_store({}),
	page: notifiable_store({}),
	navigating: writable(/** @type {import('types').Navigation | null} */ (null)),
	updated: create_updated_store()
};
