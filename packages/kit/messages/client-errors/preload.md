## preload_invalid_route_id

> `preloadCode` expects a route ID starting with `/` (such as `/blog/[slug]`), but received `%id%`

[`preloadCode`](https://svelte.dev/docs/kit/$app-navigation#preloadCode) takes the ID of a route, which is its path inside `src/routes` starting with `/`, such as `/blog/[slug]`. Route IDs are never prefixed with the app's [base path](https://svelte.dev/docs/kit/configuration#paths). If you have a URL or pathname, convert it with [`match`](https://svelte.dev/docs/kit/$app-paths#match) from `$app/paths`:

```js
import { match } from '$app/paths';
import { preloadCode } from '$app/navigation';

const matched = await match('/blog/hello-world');
if (matched) await preloadCode(matched.id);
```

## preload_url_outside_app

> Attempted to preload a URL that does not belong to this app: `%url%`

[`preloadData`](https://svelte.dev/docs/kit/$app-navigation#preloadData) runs the `load` functions of one of your app's pages, so the URL must be on the app's origin (and inside its [base path](https://svelte.dev/docs/kit/configuration#paths)) and match a route with a `+page`. Check the URL for typos, and don't preload external URLs.
