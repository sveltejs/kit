/** @import {SvelteKitPayload} from 'types'; */

/**
 * Code inside the SvelteKit client runtime should only use this, not the global,
 * so that the file hashes stay stable between rebuilds as long as the SvelteKit runtime doesn't change
 */
export let payload = __SVELTEKIT_PAYLOAD__ ?? /** @type {SvelteKitPayload} */ ({});

/** @param {SvelteKitPayload} value */
export function set_payload(value) {
	payload = value;
}

// this makes Vite inject its dev client code as this module's first dependency
// so that global constant replacements are done before any other module evaluates.
// For build, it's inert.
import.meta.hot;
