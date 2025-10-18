/** @import { Asset, RouteId, Pathname, ResolvedPathname } from '$app/types' */
/** @import { ResolveArgs } from './types.js' */
import { base, assets } from './internal/client.js';
import { resolve_route } from '../../../utils/routing.js';

/**
 * Resolve the URL of an asset in your `static` directory, by prefixing it with [`config.kit.paths.assets`](https://svelte.dev/docs/kit/configuration#paths) if configured, or otherwise by prefixing it with the base path.
 *
 * During server rendering, the base path is relative and depends on the page currently being rendered.
 *
 * @example
 * ```svelte
 * <script>
 * 	import { asset } from '$app/paths';
 * </script>
 *
 * <img alt="a potato" src={asset('/potato.jpg')} />
 * ```
 * @since 2.26
 *
 * @param {Asset} file
 * @returns {string}
 */
export function asset(file) {
	return (assets || base) + file;
}

/**
 * Resolve a pathname by prefixing it with the base path, if any,
 * or resolve a route ID by populating dynamic segments with route parameters.
 * Optionally accepts URL parameters and appends these to the resolved route.
 *
 * During server rendering, the base path is relative and depends on the page currently being rendered.
 *
 * @example
 * ```js
 * import { resolve } from '$app/paths';
 *
 * // using a pathname
 * const resolved = resolve(`/blog/hello-world`);
 *
 * // using a route ID plus route parameters
 * const resolved = resolve('/blog/[slug]', {
 * 	slug: 'hello-world'
 * });
 *
 * // using a route ID plus URL parameters as Record
 * const resolved = resolve('/blog/search',
 * 	{ hash: 'results', searchParams: { author: 'John Doe', year: '2025' } }
 * });
 *
 * // using a route ID plus URL parameters as URLSearchParams
 * const resolved = resolve('/blog/search',
 * 	{ hash: 'results', searchParams: new URLSearchParams({ author: 'John Doe', year: '2025' }) }
 * });
 *
 * // using a route ID plus route parameters and URL parameters
 * const resolved = resolve('/blog/[slug]',
 * 	{ slug: 'hello-world' },
 * 	{ hash: 'introduction' }
 * });
 * ```
 * @since 2.26
 *
 * @template {RouteId | Pathname} T
 * @param {ResolveArgs<T>} args
 * @returns {ResolvedPathname}
 */
export function resolve(...args) {
	// args[0] is always the route ID or pathname
	const routeID = /** @type {string} */ (args[0]);

	/** @type {Record<string, string> | undefined} */
	let routeParams;

	/** @type {{ searchParams?: Record<string, string> | URLSearchParams; hash?: string } | undefined} */
	let urlParams;

	// Determine if args[1] is route params or URL params
	if (args.length === 2) {
		const searchParamsOrURLParams = args[1];
		// If args[1] is actually undefined, we don't need to do anything
		if (searchParamsOrURLParams) {
			if ('searchParams' in searchParamsOrURLParams || 'hash' in searchParamsOrURLParams) {
				// It's URL params
				urlParams = searchParamsOrURLParams;
			} else {
				// Otherwise, it's route params
				routeParams = /** @type {Record<string, string>} */ (searchParamsOrURLParams);
			}
		}
	} else if (args.length === 3) {
		// args[1] is route params, args[2] is URL params
		routeParams = args[1];
		urlParams = args[2];
	}

	// The type error is correct here, and if someone doesn't pass params when they should there's a runtime error,
	// but we don't want to adjust the internal resolve_route function to accept undefined, hence the type cast.
	let resolvedPath =
		base + resolve_route(routeID, /** @type {Record<string, string>} */ (routeParams));

	// Append searchParams and hash if provided. These do not affect route resolving.
	if (urlParams?.searchParams) {
		const { searchParams } = urlParams;

		if (searchParams instanceof URLSearchParams) {
			resolvedPath += `?${searchParams.toString()}`;
		} else {
			const query = new URLSearchParams();
			for (const [key, value] of Object.entries(searchParams)) {
				query.append(key, value);
			}
			resolvedPath += `?${query.toString()}`;
		}
	}

	if (urlParams?.hash) {
		resolvedPath += `#${urlParams.hash}`;
	}

	return resolvedPath;
}
export { base, assets, resolve as resolveRoute };
