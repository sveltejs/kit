import { writable } from 'svelte/store';
import { create_updated_store, notifiable_store } from './utils.js';

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

export const stores = {
	url: notifiable_store({}),
	page: notifiable_store({}),
	navigating: writable(/** @type {import('types').Navigation | null} */ (null)),
	updated: create_updated_store()
};
