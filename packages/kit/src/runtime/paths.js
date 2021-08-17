/** @type {string} */
export let base = '';

/** @type {string} */
export let assets = '';

/** @param {{ base: string, assets: string }} paths */
export function set_paths(paths) {
	base = paths.base;
	assets = paths.assets || base;
}
