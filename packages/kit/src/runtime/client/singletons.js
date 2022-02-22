/**
 * The router is nullable, but not typed that way for ease-of-use
 * @type {import('./router').Router}
 */
export let router;

/** @type {import('./renderer').Renderer} */
export let renderer;

/** @type {import('./prefetcher').Prefetcher | undefined} */
export let prefetcher;

/**
 * @param {{
 *   router: import('./router').Router?;
 *   renderer: import('./renderer').Renderer;
 *   prefetcher?: import('./prefetcher').Prefetcher;
 * }} opts
 */
export function init(opts) {
	router = /** @type {import('../client/router').Router} */ (opts.router);
	renderer = opts.renderer;
	prefetcher = opts.prefetcher;
}
