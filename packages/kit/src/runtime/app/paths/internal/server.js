// TODO get rid of this module — merge the contents into `../server.js`, and expose it to the
// rest of the codebase as `#app/paths/server`, with an export condition that errors if
// it is imported on the client

export const base = __SVELTEKIT_PATHS_BASE__;
export let assets = __SVELTEKIT_PATHS_ASSETS__ || base;
export const app_dir = __SVELTEKIT_APP_DIR__;
export const relative = __SVELTEKIT_PATHS_RELATIVE__;

/** @param {string} path */
export function set_assets(path) {
	assets = path;
}
