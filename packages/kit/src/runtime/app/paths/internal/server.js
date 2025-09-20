export let base = __SVELTEKIT_PATHS_BASE__;
export let assets = __SVELTEKIT_PATHS_ASSETS__ || base;
export const app_dir = __SVELTEKIT_APP_DIR__;
export const relative = __SVELTEKIT_PATHS_RELATIVE__;

const initial = { base, assets };

/**
 * @param {{ base: string, assets: string }} paths
 */
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
