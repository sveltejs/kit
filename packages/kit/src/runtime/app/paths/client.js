/** @import { AssetPath, RouteId, RouteIdWithSearchOrHash, PathnameWithSearchOrHash, ResolvedPathname, RouteParams } from '$app/types' */
/** @import { ResolveArgs } from './types.js' */
import { base, assets, hash_routing, match_implementation } from './internal/client.js';
import { resolve_route } from '../../../utils/routing.js';
import { DEV } from 'esm-env';

export { base, assets, app_dir } from './internal/client.js';

/**
 * Resolve the URL of an asset in your `static` directory, by prefixing it with [`config.paths.assets`](https://svelte.dev/docs/kit/configuration#paths) if configured, or otherwise by prefixing it with the base path.
 *
 * During server rendering, the base path is relative and depends on the page currently being rendered.
 *
 * @example
 * ```svelte
 * <script>
 * 	import { asset } from '$app/paths';
 * </script>
 *
 * <img alt="a potato" src={asset('potato.jpg')} />
 * ```
 * @since 2.26
 *
 * @param {AssetPath} file
 * @returns {string}
 */
export function asset(file) {
	let path = /** @type {string} */ (file);

	// TODO 4.0 remove this
	if (path[0] === '/') {
		if (DEV) {
			console.warn(`\`asset('${path}')\` should now be \`asset('${path.slice(1)}')\``);
		}

		path = path.slice(1);
	}

	return (assets || base) + '/' + path;
}

const pathname_prefix = hash_routing ? '#' : '';

/**
 * Resolve a pathname by prefixing it with the base path, if any, or resolve a route ID by populating dynamic segments with parameters.
 *
 * During server rendering, the base path is relative and depends on the page currently being rendered.
 *
 * @example
 * ```js
 * import { resolve } from '$app/paths';
 *
 * // using a pathname
 * const resolved = resolve(`blog/hello-world`);
 *
 * // using a route ID plus parameters
 * const resolved = resolve('/blog/[slug]', {
 * 	slug: 'hello-world'
 * });
 * ```
 * @since 2.26
 *
 * @template {RouteIdWithSearchOrHash | PathnameWithSearchOrHash | AssetPath | (string & {})} T
 * @param {ResolveArgs<T>} args
 * @returns {ResolvedPathname}
 */
export function resolve(...args) {
	const [id, params] = /** @type {[string, Record<string, string>?]} */ (args);

	if (id[0] === '/') {
		// route ID
		if (id.includes('[') && !params) {
			throw new Error(`Missing params for dynamic route ID ${id}`);
		}

		return (
			/** @type {ResolvedPathname} */ (base + pathname_prefix + resolve_route(id, params ?? {}))
		);
	}

	return /** @type {ResolvedPathname} */ (base + pathname_prefix + '/' + id);
}

/**
 * Match a path or URL to a route ID and extracts any parameters.
 *
 * @example
 * ```js
 * import { match } from '$app/paths';
 *
 * const route = await match('blog/hello-world');
 *
 * if (route?.id === '/blog/[slug]') {
 * 	const slug = route.params.slug;
 * 	const response = await fetch(`/api/posts/${slug}`);
 * 	const post = await response.json();
 * }
 * ```
 * @since 2.52.0
 *
 * @param {URL | string} url
 * @returns {Promise<{ [K in RouteId]: { id: K; params: RouteParams<K>; } }[RouteId] | null>}
 */
export function match(url) {
	return match_implementation(url);
}
