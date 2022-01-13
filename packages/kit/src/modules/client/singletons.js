/** @type {import('./router').Router?} */
export let router;

/** @type {import('./renderer').Renderer} */
export let renderer;

/**
 * @param {{
 *   router: import('./router').Router?;
 *   renderer: import('./renderer').Renderer;
 * }} opts
 */
export function init(opts) {
	router = opts.router;
	renderer = opts.renderer;
}
