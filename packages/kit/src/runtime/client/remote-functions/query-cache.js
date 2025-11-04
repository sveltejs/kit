import { CacheObserver } from 'svelte/reactivity';
import { REMOTE_CACHE_PREFIX } from '@sveltejs/kit/internal';

// TODO there's no reason this can't be better-typed
/** @type {CacheObserver<any>} */
export const query_cache = new CacheObserver(REMOTE_CACHE_PREFIX);
