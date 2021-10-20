/** @type {import('./router').Router?} */
export let router;

/** @type {import('./prefetcher').Prefetcher?} */
export let prefetcher;

/**
 * @param {import('./router').Router?} r
 * @param {import('./prefetcher').Prefetcher?} p
 */
export function init(r, p) {
	router = r;
	prefetcher = p;
}
