---
title: Writing adapters
---

If an adapter for your preferred environment doesn't yet exist, you can build your own. We recommend [looking at the source for an adapter](https://github.com/sveltejs/kit/tree/main/packages) to a platform similar to yours and copying it as a starting point.

Adapter packages implement the following API, which creates an `Adapter`:

```js
// @errors: 2322
// @filename: ambient.d.ts
type AdapterSpecificOptions = any;

// @filename: index.js
// ---cut---
/** @param {AdapterSpecificOptions} options */
export default function (options) {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: 'adapter-package-name',
		async adapt(builder) {
			// adapter implementation
		},
		async emulate() {
			return {
				async platform({ config, prerender }) {
					// the returned object becomes `event.platform` during dev, build and
					// preview. Its shape is that of `App.Platform`
				}
			}
		},
		supports: {
			read: ({ config, route }) => {
				// Return `true` if the route with the given `config` can use `read`
				// from `$app/server` in production, return `false` if it can't.
				// Or throw a descriptive error describing how to configure the deployment
			},
			instrumentation: () => {
				// Return `true` if this adapter supports loading `instrumentation.server.js`.
				// Return `false if it can't, or throw a descriptive error.
			}
		},
		cache: {
			// This module will be imported and used to handle cache operations
			path: 'adapter-package-name/cache',
			// Optional: these will be passed to the default export of the module
			options: {
				some: 'value'
			}
		}
	};

	return adapter;
}
```

Of these, `name` and `adapt` are required. `emulate`, `supports` and `cache` are optional.

Within the `adapt` method, there are a number of things that an adapter should do:

- Clear out the build directory
- Write SvelteKit output with `builder.writeClient`, `builder.writeServer`, and `builder.writePrerendered`
- Output code that:
	- Imports `Server` from `${builder.getServerDirectory()}/index.js`
	- Instantiates the app with a manifest generated with `builder.generateManifest({ relativePath })`
	- Listens for requests from the platform, converts them to a standard [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) if necessary, calls the `server.respond(request, { getClientAddress })` function to generate a [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) and responds with it
	- expose any platform-specific information to SvelteKit via the `platform` option passed to `server.respond`
	- Globally shims `fetch` to work on the target platform, if necessary. SvelteKit provides a `@sveltejs/kit/node/polyfills` helper for platforms that can use `undici`
- Bundle the output to avoid needing to install dependencies on the target platform, if necessary
- Put the user's static files and the generated JS/CSS in the correct location for the target platform

Where possible, we recommend putting the adapter output under the `build/` directory with any intermediate output placed under `.svelte-kit/[adapter-name]`.

## Cache adapter

SvelteKit's remote functions come with a caching API, but its implementation is provided through a cache adapter. If your target platform provides a caching layer (like a CDN cache, edge cache, or Key-Value store), you can provide a cache implementation directly inside your adapter, or you provide a standalone implementation (like SvelteKit's built-in `inMemoryCache`).

In both cases, you need to provide a module with a default export function that implements the following signature:

```js
// @filename: cache.js
// ---cut---
/** 
 * @param {Record<string, unknown>} options
 * @returns {import('@sveltejs/kit').KitCacheHandler} 
 */
export default function create_cache(options) {
	return {
		// Called to retrieve a cached response
		async get(query_id) {
			// Fetch and return the cached string, or undefined if not found
		},

		// Called to cache a successful response
		async set(query_id, stringified_response, cache) {
			// Save the response. The `cache` object contains:
			// { maxAge: number, staleWhileRevalidate?: number, tags: string[] }
		},

		// Called when the remote query is called from the client. Optional.
		setHeaders(headers, cache) {
			// Example: headers.set('CDN-Cache-Control', `public, max-age=${cache.maxAge}`);
		},

		// Called to invalidate specific tags, including single queries (which are represented via a tag, too)
		async invalidate(tags) {
			// Purge the tags from your cache
		}
	};
}
```

Then either provide the cache implementation through your adapter, or in case of a standalone cache adapter via `svelte.config.js` using the `kit.cache` option:

```js
// @errors: 2307
/// file: svelte.config.js
import { cacheAdapter } from 'cache-adapter-package-name';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// the function should return { path: 'cache-adapter-package-name/cache', options: { some: 'option' } }
		cache: cacheAdapter({ some: 'option' })
	}
};

export default config;
```
