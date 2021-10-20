/** @type {import('./renderer').Renderer} */
export let renderer;

/** @type {import('./router').Router?} */
export let router;

/** @type {import('./prefetcher').Prefetcher?} */
export let prefetcher;

/**
 * @param {import('./renderer').Renderer} render
 * @param {import('./router').Router?} route
 * @param {import('./prefetcher').Prefetcher?} prefetch
 */
export function init(render, route, prefetch) {
	renderer = render;
	router = route;
	prefetcher = prefetch;
}
