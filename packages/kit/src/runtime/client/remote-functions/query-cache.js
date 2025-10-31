import { CacheObserver } from 'svelte/reactivity';
import { QUERY_CACHE_PREFIX } from '../../shared.js';

// TODO there's no reason this can't be better-typed
/** @type {CacheObserver<any>} */
export const query_cache = new CacheObserver(QUERY_CACHE_PREFIX);
