import { CacheObserver } from 'svelte/reactivity';
import { REMOTE_CACHE_PREFIX } from '@sveltejs/kit/internal';

// TODO there's no reason this can't be better-typed
/** @type {CacheObserver<any>} */
export const query_cache = (() => {
	// TODO remove in 3.0
	try {
		// not available if `async` isn't on -- but nothing to do with remote functions is
		return new CacheObserver(REMOTE_CACHE_PREFIX);
	} catch {
		return /** @type {CacheObserver<any>} */ (/** @type {unknown} */ (new Map()));
	}
})();
