## prerender_http_error

> Failed to prerender `%path%`

> `%path%` was %reference_type% from `%referrer%`

While [prerendering](https://svelte.dev/docs/kit/page-options#prerender), SvelteKit requested this path — because it was listed in [`prerender.entries`](https://svelte.dev/docs/kit/configuration#prerender), returned from an [`entries`](https://svelte.dev/docs/kit/page-options#entries) function, linked from a prerendered page or fetched during its `load` — and received an error response, which is logged above. When the path was reached from another page, the message says which one.

Fix the link or request, or the error in the route. If the failure is expected, handle it with [`prerender.handleHttpError`](https://svelte.dev/docs/kit/configuration#prerender):

```js
sveltekit({
	prerender: {
		handleHttpError: ({ path, referrer, message }) => {
			// ignore deliberate link to shiny 404 page
			if (path === '/not-found' && referrer === '/blog/how-we-built-our-404-page') {
				return;
			}

			// otherwise fail the build
			throw new Error(message);
		}
	}
});
```

## prerender_path_outside_base

> `%path%` does not begin with `base`. You can fix this by using `resolve('%path%')` from `$app/paths`. The base path is configurable from `paths.base`

> `%path%` (%reference_type% from `%referrer%`) does not begin with `base`. You can fix this by using `resolve('%path%')` from `$app/paths`. The base path is configurable from `paths.base`

Your app is served under [`paths.base`](https://svelte.dev/docs/kit/configuration#paths), so every internal URL must start with it. Build links with [`resolve`](https://svelte.dev/docs/kit/$app-paths#resolve) from `$app/paths` instead of hard-coding them, so that the base path is added for you. Like other prerendering HTTP errors, this can be handled with [`prerender.handleHttpError`](https://svelte.dev/docs/kit/configuration#prerender).

## prerender_missing_id

> The following pages contain links to `%path%#%id%`, but no element with `id="%id%"` exists on `%path%`:
> %referrers%

A prerendered page links to a fragment (`#id`) that doesn't exist on the target page, so the link won't scroll anywhere. Add an element with that `id` to the target page, or fix the link. Handle or ignore these cases with [`prerender.handleMissingId`](https://svelte.dev/docs/kit/configuration#prerender).

## prerender_entry_generator_mismatch

> The `entries` export from `%id%` generated entry `%entry%`, which was matched by `%matched%`

An [`entries`](https://svelte.dev/docs/kit/page-options#entries) function returns paths that its own route should prerender, but this path is handled by a different route, so the page you expected isn't generated. This usually means a more specific route takes priority (see [sorting](https://svelte.dev/docs/kit/advanced-routing#Sorting)). Change the entries, or the routes, so each entry is matched by the route that generated it. Handle or ignore these cases with [`prerender.handleEntryGeneratorMismatch`](https://svelte.dev/docs/kit/configuration#prerender).

## prerender_unseen_routes

> The following routes were marked as prerenderable, but were not prerendered because they were not found while crawling your app:
> %routes%

These routes (or a parent layout) have `export const prerender = true`, but the prerendering crawler never reached them, so they weren't prerendered. Since prerendered routes can't be server-rendered on demand, requesting them would fail. To fix it:

- Make sure SvelteKit can find the route by following links from [`prerender.entries`](https://svelte.dev/docs/kit/configuration#prerender) or from pages reached by other entries.
- For dynamic routes, export an [`entries`](https://svelte.dev/docs/kit/page-options#entries) function that lists the parameter values to prerender.
- Change `export const prerender = true` to `export const prerender = 'auto'`, so that routes that weren't prerendered can still be rendered on demand.

Handle or ignore these cases with [`prerender.handleUnseenRoutes`](https://svelte.dev/docs/kit/configuration#prerender).

## prerender_invalid_url

> Invalid URL `%href%`

> Invalid URL `%href%` (linked from `%referrer%`)

A prerendered page contains a link whose `href` can't be parsed as a URL. Fix the link. Handle or ignore these cases with [`prerender.handleInvalidUrl`](https://svelte.dev/docs/kit/configuration#prerender).

## prerender_client_address

> Cannot read `clientAddress` during prerendering

When a page is [prerendered](https://svelte.dev/docs/kit/page-options#prerender), there's no user making the request, so `event.getClientAddress()` has nothing to return. Only call it in routes that aren't prerendered, or move it out of code that runs during prerendering, such as a root layout's `load` or `handle`. You can use [`building`](https://svelte.dev/docs/kit/$app-env#building) from `$app/env` to skip that code during the build.

## prerender_root_non_html

> Cannot prerender a root `+server.js` that returns a non-HTML response — static hosts always serve an HTML file for `%base%`

A prerendered response is written to a file, and static hosts serve the root of your app from an HTML file. A `+server.js` at the root that returns another content type, such as JSON, can't be represented. Return HTML from it, move the endpoint to another route (for example `src/routes/data.json/+server.js`), or don't prerender it.

## prerender_directory_conflict

> Cannot save `%path%` as it is already a directory. See https://svelte.dev/docs/kit/page-options#prerender-route-conflicts for more information

> Cannot save `%path%` as `%parent%` is already a file. See https://svelte.dev/docs/kit/page-options#prerender-route-conflicts for more information

Prerendering writes each response to a file, and a file and a directory can't share a name. For example, `src/routes/foo/+server.js` and `src/routes/foo/bar/+server.js` would need both a file and a directory called `foo`. Add a file extension to endpoint routes, such as `src/routes/foo.json/+server.js`, so their output names don't clash. See [route conflicts](https://svelte.dev/docs/kit/page-options#Route-conflicts).

## prerender_endpoint_methods

> Cannot prerender a `+server` file with %methods% or fallback handlers (`%id%`)

A prerendered endpoint is saved as a static file, which can only answer `GET` requests. Methods that depend on a request body, and `fallback` handlers, would stop working. Move these handlers to a route that isn't prerendered, or remove `export const prerender = true` from this one.

## prerender_fallback_failed

> Could not create a fallback page

SvelteKit renders a fallback page for [single-page apps](https://svelte.dev/docs/kit/single-page-apps) and the hash router by rendering your root layout without a page. That render returned an error response. Check that your root layout (including its `load` functions) and `handle` hook work without a specific route or URL, for example by avoiding code that depends on `params` or on `getClientAddress`.
