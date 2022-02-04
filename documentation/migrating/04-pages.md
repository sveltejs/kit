---
title: Pages and layouts
---

### Renamed files

Your custom error page component should be renamed from `_error.svelte` to `__error.svelte`. Any `_layout.svelte` files should likewise be renamed `__layout.svelte`. The double underscore prefix is reserved for SvelteKit; your own [private modules](#routing-private-modules) are still denoted with a single `_` prefix (configurable via [`routes`](docs#configuration-routes) config).

### Imports

The `goto`, `prefetch` and `prefetchRoutes` imports from `@sapper/app` should be replaced with identical imports from [`$app/navigation`](/docs#modules-$app-navigation).

The `stores` import from `@sapper/app` should be replaced — see the [Stores](#pages-and-layouts-stores) section below.

Any files you previously imported from directories in `src/node_modules` will need to be replaced with [`$lib`](/docs#modules-$lib) imports.

### Preload

As before, pages and layout components can export a function that allows data to be loaded before rendering takes place.

This function has been renamed from `preload` to [`load`](/docs#loading), and its API has changed. Instead of two arguments — `page` and `session` — there is a single argument that includes both, along with `fetch` (which replaces `this.fetch`) and a new `stuff` object.

There is no more `this` object, and consequently no `this.fetch`, `this.error` or `this.redirect`. Instead of returning props directly, `load` now returns an object that _contains_ `props`, alongside various other things.

Lastly, if your page has a `load` method, make sure to return something otherwise you will get `Not found`.

### Stores

In Sapper, you would get references to provided stores like so:

```js
import { stores } from '@sapper/app';
const { preloading, page, session } = stores();
```

The `page` and `session` stores still exist; `preloading` has been replaced with a `navigating` store that contains `from` and `to` properties. `page` now has `url` and `params` properties, but no `path` or `query`.

You access them differently in SvelteKit. `stores` is now `getStores`, but in most cases it is unnecessary since you can import `navigating`, `page` and `session` directly from [`$app/stores`](/docs#modules-$app-stores).

### Routing

Regex routes are no longer supported. Instead, use [fallthrough routes](/docs#routing-advanced-routing-fallthrough-routes).

### URLs

In Sapper, all relative URLs were resolved against the base URL — usually `/`, unless the `basepath` option was used — rather than against the current page.

This caused problems and is no longer the case in SvelteKit. Instead, URLs are resolved against the current page (or the destination page, for `fetch` URLs in `load` functions) instead.

### &lt;a&gt; attributes

- `sapper:prefetch` is now `sveltekit:prefetch`
- `sapper:noscroll` is now `sveltekit:noscroll`
