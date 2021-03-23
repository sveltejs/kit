---
title: Pages and layouts
---

### Renamed files

Your custom error page component should be renamed from `_error.svelte` to `$error.svelte`. Any `_layout.svelte` files should likewise be renamed `$layout.svelte`. The `_` prefix now exclusively denotes your *own* 'private' components and modules, as opposed to those with a special meaning to SvelteKit.

### Imports

The `goto`, `prefetch` and `prefetchRoutes` imports from `@sapper/app` should be replaced with identical imports from [`$app/navigation`](/docs#modules-app-navigation).

The `stores` import from `@sapper/app` should be replaced — see the [Stores](#pages-and-layouts-stores) section below.

Any files you previously imported from directories in `src/node_modules` will need to be replaced with [`$lib`](/docs#modules-lib) imports.

### Preload

As before, pages and layout components can export a function that allows data to be loaded before rendering takes place.

This function has been renamed from `preload` to [`load`](/docs#loading), and its API has changed. Instead of two arguments — `page` and `session` — there is a single argument that includes both, along with `fetch` (which replaces `this.fetch`) and a new `context` object.

There is no more `this` object, and consequently no `this.fetch`, `this.error` or `this.redirect`. Instead of returning props directly, `load` now returns an object that *contains* `props`, alongside various other things.

### Stores

In Sapper, you would get references to provided stores like so:

```js
import { stores } from '@sapper/app';
const { preloading, page, session } = stores();
```

The `page` and `session` stores still exist; `preloading` has been replaced with a `navigating` store that contains `from` and `to` properties.

You access them differently in SvelteKit. `stores` is now `getStores`, but in most cases it is unnecessary since you can import `navigating`, `page` and `session` directly from [`$app/stores`](/docs#modules-app-stores).

### &lt;a&gt; attributes

* `sapper:prefetch` is now `sveltekit:prefetch`
* `sapper:noscroll` is now `sveltekit:noscroll`