## preload_code_endpoint_only

> '%id%' has no `+page`, so there is no code to preload. If you meant to warm up an endpoint, request it with `fetch` instead.

[`preloadCode`](https://svelte.dev/docs/kit/$app-navigation#preloadCode) imports the components and universal `load` modules of a page. The route exists, but it only has a `+server.js`, so there's nothing to preload.

## preload_data_failed

> Preloading data for %path% failed with the following error: %message%

A link with [`data-sveltekit-preload-data`](https://svelte.dev/docs/kit/link-options#data-sveltekit-preload-data) caused SvelteKit to run the `load` functions of its page ahead of time, and one of them failed. If the error is transient, you can ignore it — the page's data is loaded again when the user navigates. Otherwise, fix the `load` function, or disable preloading for this link with `data-sveltekit-preload-data="false"`.

## preload_route_is_pathname

> '%id%' did not match any route, but it does match as a pathname — use `match(...)` from `$app/paths` to convert a pathname into a route ID

[`preloadCode`](https://svelte.dev/docs/kit/$app-navigation#preloadCode) takes a route ID such as `/blog/[slug]`, not a pathname such as `/blog/hello-world` (which it accepted in earlier versions). Convert the pathname with [`match`](https://svelte.dev/docs/kit/$app-paths#match):

```js
import { match } from '$app/paths';
import { preloadCode } from '$app/navigation';

const matched = await match('/blog/hello-world');
if (matched) await preloadCode(matched.id);
```

## preload_route_missing

> '%id%' did not match any route

[`preloadCode`](https://svelte.dev/docs/kit/$app-navigation#preloadCode) takes the ID of a route, which is its path inside `src/routes`, such as `/blog/[slug]`. Check the ID for typos. Routes without a `+page` have no code to preload, and with client-side route resolution they aren't known to the browser at all, so they also cause this warning.
