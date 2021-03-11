---
title: Client API
---

The `$app/navigation` and `$app/stores` modules contain functions for controlling SvelteKit programmatically and responding to events.

### goto(href, options?)

- `href` — the page to go to
- `options` — not required
  - `replaceState` (`boolean`, default `false`) — determines whether to use `history.pushState` (the default) or `history.replaceState`.
  - `noscroll` (`boolean`, default `false`) — prevent scroll to top after navigation.

Programmatically navigates to the given `href`. If the destination is a SvelteKit route, SvelteKit will handle the navigation, otherwise the page will be reloaded with the new `href`. In other words, the behaviour is as though the user clicked on a link with this `href`.

Returns a `Promise` that resolves when the navigation is complete. This can be used to perform actions once the navigation has completed, such as updating a database, store, etc.

```js
import { goto } from '$app/navigation';

const navigateAndSave = async () => {
	await goto('/');
	saveItem();
};

const saveItem = () => {
	// do something with the database
};
```

### prefetch(href)

- `href` — the page to prefetch

Programmatically prefetches the given page, which means a) ensuring that the code for the page is loaded, and b) calling the page's `preload` method with the appropriate options. This is the same behaviour that SvelteKit triggers when the user taps or mouses over an `<a>` element with [sveltekit:prefetch](docs#sveltekit_prefetch).

Returns a `Promise` that resolves when the prefetch is complete.

### prefetchRoutes(routes?)

- `routes` — an optional array of strings representing routes to prefetch

Programmatically prefetches the code for routes that haven't yet been fetched. Typically, you might call this to speed up subsequent navigation (this is the 'L' of the [PRPL pattern](https://developers.google.com/web/fundamentals/performance/prpl-pattern/)). Omitting arguments will cause all routes to be fetched, or you can specify routes by any matching pathname such as `/about` (to match `src/routes/about.svelte`) or `/blog/*` (to match `src/routes/blog/[slug].svelte`). Unlike `prefetch`, this won't call `preload` for individual pages.

Returns a `Promise` that resolves when the routes have been prefetched.
