/* in development or if `bundleStrategy` is 'split', this file is used as the entry point */

import { set_payload } from './payload.js';

/** @type {Promise<typeof import('./client-entry.js')>} */
let client;

/** @param {import('types').SvelteKitPayload} payload */
export function init(payload) {
	set_payload(payload);
	// Importing the client after setting the payload ensures that modules such as
	// `$app/paths` can read it during initialization.
	client ??= import('./client-entry.js');
}

/** @param {Parameters<import('./client-entry.js').start>} args */
export async function start(...args) {
	return (await client).start(...args);
}

/** @param {Parameters<import('./client-entry.js').load_css>} args */
export async function load_css(...args) {
	return (await client).load_css(...args);
}
