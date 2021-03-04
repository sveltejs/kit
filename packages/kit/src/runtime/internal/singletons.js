/** @type {import('./router').Router} */
export let router;

/** @type {import('./renderer').Renderer} */
export let renderer;

/** @type {string} */
export let base = '';

/** @type {string} */
export let assets = '/.';

/** @param {{
 *   router: import('./router').Router,
 *   renderer: import('./renderer').Renderer
 * }} opts */
export function init(opts) {
	({ router, renderer } = opts);
}

/** @param {{ base: string, assets: string }} paths */
export function set_paths(paths) {
	({ base, assets } = paths);
}
