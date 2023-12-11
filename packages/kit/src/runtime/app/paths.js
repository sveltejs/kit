export { base, assets } from '__sveltekit/paths';
import { base } from '__sveltekit/paths';
import { get_route_segments } from '../../utils/routing.js';

const basic_param_pattern = /\[(\[)?(\.\.\.)?(\w+?)(?:=(\w+))?\]\]?/g;

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
	const segments = get_route_segments(id);
	return (
		base +
		'/' +
		segments
			.map((segment) =>
				segment.replace(basic_param_pattern, (_, optional, rest, name) => {
					const param_value = params[name];

					// This is nested so TS correctly narrows the type
					if (!param_value) {
						if (optional) return '';
						if (rest && param_value !== undefined) return '';
						throw new Error(`Missing parameter '${name}' in route ${id}`);
					}

					if (param_value.startsWith('/') || param_value.endsWith('/'))
						throw new Error(
							`Parameter '${name}' in route ${id} cannot start or end with a slash -- this would cause an invalid route like foo//bar`
						);
					return param_value;
				})
			)
			.filter(Boolean)
			.join('/')
	);
}
