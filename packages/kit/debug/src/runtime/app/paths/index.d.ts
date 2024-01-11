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
 * @param {any} [params]
 * @returns {string}
 */
export function resolveRoute(id: string, params?: any): string;
export { base, assets } from "__sveltekit/paths";
//# sourceMappingURL=index.d.ts.map