## route_params_slow

> The `%id%` route can be slow to match, which could allow denial-of-service attacks, and won't be supported in SvelteKit 4: %reason%

The time taken to match a request against this route grows greatly depending on the length of the URL, so a long, carefully crafted URL can keep the server busy for seconds. To make sure every route can be matched quickly, SvelteKit 4 will not allow routes where:

- a single directory with more than one [parameter](https://svelte.dev/docs/kit/routing) has an optional or rest parameter in any position but the last — `[a]-[b]-[[c]]` is fine, but `[[a]]-[b]` and `[...a]-[b]` aren't
- there's more than one [rest parameter](https://svelte.dev/docs/kit/advanced-routing#Rest-parameters)

Instead, capture that part of the path with a single parameter, and split it in your own code. For example, instead of `src/routes/[...a]/x/[...b]`, use `src/routes/[...path=has_x]` with a [matcher](https://svelte.dev/docs/kit/advanced-routing#Matching) that only matches paths containing an `x` directory:

```js
/// file: src/params.js
import { defineParams } from '@sveltejs/kit/params';

export const params = defineParams({
	has_x: (path) => (path.split('/').includes('x') ? path : undefined)
});
```

...and a utility that splits `params.path` wherever you need the individual parts, taking the last `x` like the original route would:

```js
/// file: src/lib/split-path.js
/** @param {string} path */
export function splitPath(path) {
	const segments = path.split('/');
	const i = segments.lastIndexOf('x');

	return {
		a: segments.slice(0, i).join('/'),
		b: segments.slice(i + 1).join('/')
	};
}
```

## route_file_prefix_missing

> Missing route file prefix. Did you mean %corrected%? at %file%

SvelteKit only recognises [route files](https://svelte.dev/docs/kit/routing) whose names start with `+`, such as `+page.svelte`, `+layout.svelte`, `+page.js` and `+server.js`. This file matches a route filename except for the missing prefix, so it will be ignored. Rename it to the suggested name if it is intended to be a route file, or choose a different name to distinguish it from one.
