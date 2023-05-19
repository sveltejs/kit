import * as paths from '__sveltekit/paths';

// TODO ensure that the underlying types are `/${string}` (for base) and `https://${string}` | `http://${string}` (for assets)

/**
 * A string that matches [`config.kit.paths.base`](https://kit.svelte.dev/docs/configuration#paths).
 *
 * Example usage: `<a href="{base}/your-page">Link</a>`
 */
export const base = paths.base;

/**
 * An absolute path that matches [`config.kit.paths.assets`](https://kit.svelte.dev/docs/configuration#paths).
 *
 * > If a value for `config.kit.paths.assets` is specified, it will be replaced with `'/_svelte_kit_assets'` during `vite dev` or `vite preview`, since the assets don't yet live at their eventual URL.
 */
export const assets = paths.assets;
