/**
 * A string that matches [`config.kit.paths.base`](https://kit.svelte.dev/docs/configuration#paths).
 *
 * Example usage: `<a href="{base}/your-page">Link</a>`
 */
export let base: '' | `/${string}`;

/**
 * An absolute path that matches [`config.kit.paths.assets`](https://kit.svelte.dev/docs/configuration#paths).
 *
 * > If a value for `config.kit.paths.assets` is specified, it will be replaced with `'/_svelte_kit_assets'` during `vite dev` or `vite preview`, since the assets don't yet live at their eventual URL.
 */
export let assets: '' | `https://${string}` | `http://${string}` | '/_svelte_kit_assets';

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
 */
export function resolveRoute(id: string, params: Record<string, string | undefined>): string;
