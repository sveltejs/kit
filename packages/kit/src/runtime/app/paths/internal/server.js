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

/**
 * The relative path from `pathname` back to `base`, e.g. `.` or `../..`
 * @param {string} pathname
 */
export function relative_base(pathname) {
	// on `/a/b/c` without a trailing slash, `.` resolves to `/a/b/`, so relative paths need to
	// start with `./c` instead
	if (base && pathname === base) return `./${base.split('/').at(-1)}`;

	const segments = pathname.slice(base.length).split('/').slice(2);
	return segments.map(() => '..').join('/') || '.';
}
