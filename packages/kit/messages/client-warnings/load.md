## window_fetch_in_load

> Loading `%url%` using `window.fetch`. For best results, use the `fetch` that is passed to your `load` function

The [`fetch`](https://svelte.dev/docs/kit/load#Making-fetch-requests) passed to `load` functions reuses responses that were inlined into the page during server-side rendering, so hydration doesn't request the same data twice, and it tracks the URL as a dependency for [`invalidate`](https://svelte.dev/docs/kit/$app-navigation#invalidate). Take `fetch` from the `load` event instead of using the global one:

```js
/// file: src/routes/+page.js
/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const response = await fetch('/api/items');
	return { items: await response.json() };
}
```
