// @ts-ignore
import { RouteId, RouteParams } from '$app/types';

/**
 * A string that matches [`config.kit.paths.base`](https://svelte.dev/docs/kit/configuration#paths).
 *
 * Example usage: `<a href="{base}/your-page">Link</a>`
 */
export let base: '' | `/${string}`;

/**
 * An absolute path that matches [`config.kit.paths.assets`](https://svelte.dev/docs/kit/configuration#paths).
 *
 * > [!NOTE] If a value for `config.kit.paths.assets` is specified, it will be replaced with `'/_svelte_kit_assets'` during `vite dev` or `vite preview`, since the assets don't yet live at their eventual URL.
 */
export let assets: '' | `https://${string}` | `http://${string}` | '/_svelte_kit_assets';

type ResolveRouteArgs<T extends RouteId> =
	RouteParams<T> extends undefined ? [route: T] : [route: T, params: RouteParams<T>];

/**
 * Populate a route ID with params to resolve a pathname.
 * @example
 * ```js
 * import { resolveRoute } from '$app/paths';
 *
 * resolveRoute(
 *   `/blog/[slug]/[...somethingElse]`,
 *   {
 *     slug: 'hello-world',
 *     somethingElse: 'something/else'
 *   }
 * ); // `/blog/hello-world/something/else`
 * ```
 */
export function resolveRoute<T extends RouteId>(...args: ResolveRouteArgs<T>): string;
