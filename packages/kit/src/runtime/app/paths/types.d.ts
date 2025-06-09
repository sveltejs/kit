// @ts-ignore
import { RouteId, RouteParams, Pathname, ResolvedPathname } from '$app/types';

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

type ResolveArgs<T extends RouteId | Pathname> = T extends RouteId
	? RouteParams<T> extends Record<string, never>
		? [route: T]
		: [route: T, params: RouteParams<T>]
	: [route: T];

/**
 * Resolve a pathname by prefixing it with the base path, if any,
 * or resolve a route ID by populating dynamic segments with parameters.
 * @example
 * ```js
 * import { resolve } from '$app/paths';
 *
 * // using a pathname
 * const resolved = resolve(`/blog/hello-world`);
 *
 * // using a route ID plus parameters
 * const resolved = resolve('/blog/[slug]', {
 * 	slug: 'hello-world'
 * });
 * ```
 * @since 2.22
 */
export function resolve<T extends RouteId | Pathname>(...args: ResolveArgs<T>): ResolvedPathname;

/**
 * @deprecated Use `resolve(...)` instead
 */
export function resolveRoute<T extends RouteId | Pathname>(
	...args: ResolveArgs<T>
): ResolvedPathname;
