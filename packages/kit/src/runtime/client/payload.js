/** @import {SvelteKitPayload} from 'types'; */

/**
 * Code inside the SvelteKit client runtime should only use this, not the global,
 * so that the file hashes stay stable between rebuilds as long as the SvelteKit runtime doesn't change
 */
export let payload = /** @type {SvelteKitPayload} */ ({});

/** @param {SvelteKitPayload} value */
export function set_payload(value) {
	payload = value;
}
