// TODO use defines here?
export let base = '';
export let assets = '';
export const app_dir = '_app';
export const relative = true;

const initial = { base, assets };

export function override(paths) {
	base = paths.base;
	assets = paths.assets;
}

export function reset() {
	base = initial.base;
	assets = initial.assets;
}

/** @param {string} path */
export function set_assets(path) {
	assets = initial.assets = path;
}
