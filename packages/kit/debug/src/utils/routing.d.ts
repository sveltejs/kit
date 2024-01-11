/**
 * Creates the regex pattern, extracts parameter names, and generates types for a route
 * @param {string} id
 */
export function parse_route_id(id: string): {
    pattern: RegExp;
    params: import("../types/internal.d.ts").RouteParam[];
};
/**
 * Removes optional params from a route ID.
 * @param {string} id
 * @returns The route id with optional params removed
 */
export function remove_optional_params(id: string): string;
/**
 * Splits a route id into its segments, removing segments that
 * don't affect the path (i.e. groups). The root route is represented by `/`
 * and will be returned as `['']`.
 * @param {string} route
 * @returns string[]
 */
export function get_route_segments(route: string): string[];
/**
 * @param {RegExpMatchArray} match
 * @param {import('../types/internal.d.ts').RouteParam[]} params
 * @param {Record<string, import('@sveltejs/kit').ParamMatcher>} matchers
 */
export function exec(match: RegExpMatchArray, params: import('../types/internal.d.ts').RouteParam[], matchers: Record<string, import('@sveltejs/kit').ParamMatcher>): Record<string, string> | undefined;
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
export function resolve_route(id: string, params: Record<string, string | undefined>): string;
//# sourceMappingURL=routing.d.ts.map