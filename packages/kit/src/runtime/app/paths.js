import { base as _base, assets as _assets } from '__sveltekit/paths';
import { resolve_route } from '../../utils/routing.js';

/**
 * An absolute path that matches [`config.kit.paths.assets`](https://kit.svelte.dev/docs/configuration#paths).
 *
 * > If a value for `config.kit.paths.assets` is specified, it will be replaced with `'/_svelte_kit_assets'` during `vite dev` or `vite preview`, since the assets don't yet live at their eventual URL.
 * @type {'' | `https://${string}` | `http://${string}` | '/_svelte_kit_assets'}
 */
export const assets = _assets;

/**
 * A string that matches [`config.kit.paths.base`](https://kit.svelte.dev/docs/configuration#paths).
 *
 * Example usage: `<a href="{base}/your-page">Link</a>`
 * @type {'' | `/${string}`}
 */
export const base = _base;

/**
 * Populate a route ID with params to resolve a pathname.
 * @example
 * ```js
 * resolveRoute(
 *   `/blog/[slug]/[...somethingElse]`,
 *   {
 *     slug: 'hello-world',
 *     somethingElse: 'something/else'
 *   }
 * ); // `/blog/hello-world/something/else`
 * ```
 * @param {string} id
 * @param {Record<string, string | undefined>} params
 * @returns {string}
 */
export function resolveRoute(id, params) {
	return base + resolve_route(id, params);
}
