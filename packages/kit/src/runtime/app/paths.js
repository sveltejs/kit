export { base, assets } from '__sveltekit/paths';
import { base } from '__sveltekit/paths';
import { resolve_route } from '../../utils/routing.js';

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
