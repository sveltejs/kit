// Stub for `__sveltekit/paths` — the internal counterpart to `$app/paths`.
// Shape from `src/types/ambient-private.d.ts`.

/** @type {'' | `/${string}`} */
export const base = '';

/** @type {'' | `https://${string}` | `http://${string}` | '/_svelte_kit_assets'} */
export const assets = '';

export const app_dir = '_app';
export const relative = false;

export function reset() {}

/** @param {{ base: string; assets: string }} _paths */
export function override(_paths) {}

/** @param {string} _path */
export function set_assets(_path) {}
