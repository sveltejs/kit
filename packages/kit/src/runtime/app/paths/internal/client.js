/** @import { RouteId } from '$app/types' */
import { payload } from '../../../client/payload.js';

export const base = payload.base ?? __SVELTEKIT_PATHS_BASE__;
export const assets = payload.assets ?? base ?? __SVELTEKIT_PATHS_ASSETS__;
export const app_dir = __SVELTEKIT_APP_DIR__;
export const hash_routing = __SVELTEKIT_HASH_ROUTING__;

/**
 * We make this configurable per-environment so that it's possible to import `$app/paths`
 * into a service worker without importing the entire client
 * @param {URL | string} _url
 * @returns {Promise<{ [K in RouteId]: { id: K; params: import('$app/types').RouteParams<K>; } }[RouteId] | null>}
 */
// eslint-disable-next-line @typescript-eslint/require-await
export let match_implementation = async (_url) => {
	// @ts-ignore
	if (typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope) {
		throw new Error(
			'Cannot use `match(...)` inside a service worker, as it depends on the SvelteKit client instance'
		);
	}

	return null;
};

/**
 * @param {typeof match_implementation} fn
 */
export function set_match_implementation(fn) {
	match_implementation = fn;
}
