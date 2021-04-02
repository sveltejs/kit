/** @type {import('./router').Router} */
export let router;

/** @type {string} */
export let base = '';

/** @type {string} */
export let assets = '/.';

/** @param {import('./router').Router} _ */
export function init(_) {
	router = _;
}

/** @param {{ base: string, assets: string }} paths */
export function set_paths(paths) {
	({ base, assets } = paths);
}
