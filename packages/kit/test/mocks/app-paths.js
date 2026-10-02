// Stub for `$app/paths`. The real module is provided by SvelteKit at runtime and
// exposes the public path helpers (`base`, `assets`, `resolve`, `asset`, `match`,
// `resolveRoute`). This stub provides no-op/empty values just so vite's import
// analysis succeeds when spec files transitively import modules that depend on it.

/** @type {'' | `/${string}`} */
export const base = '';

/** @type {'' | `https://${string}` | `http://${string}` | '/_svelte_kit_assets'} */
export const assets = '';

/** @param {string} file */
export function asset(file) {
	return file;
}

/** @param {string} id */
export function resolve(id) {
	return id;
}

export const resolveRoute = resolve;

/** @returns {Promise<null>} */
export function match() {
	return Promise.resolve(null);
}
