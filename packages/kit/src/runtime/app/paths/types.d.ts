// These types live here because I can't figure out how to express them with JSDoc

import { RouteIds } from '$types';

// Type utility to extract keys that correspond to routes
type RouteWithParams = {
	[K in keyof RouteIds]: RouteIds[K] extends never ? never : K;
}[keyof RouteIds];

type RouteWithoutParams = {
	[K in keyof RouteIds]: RouteIds[K] extends never ? K : never;
}[keyof RouteIds];

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
export function resolveRoute<K extends RouteWithParams>(id: K, params: RouteIds[K]): string;
export function resolveRoute<K extends RouteWithoutParams>(id: K): string;

export { base, assets } from '__sveltekit/paths';
