---
title: Modules
---

SvelteKit makes a number of modules available to your application.

### $app/env

```js
import { amp, browser, dev, mode, prerendering } from '$app/env';
```

- `amp` is `true` or `false` depending on the corresponding value in your [project configuration](#configuration)
- `browser` is `true` or `false` depending on whether the app is running in the browser or on the server
- `dev` is `true` in development mode, `false` in production
- `mode` is the [Vite mode](https://vitejs.dev/guide/env-and-mode.html#modes), which is `development` in dev mode or `production` during build unless configured otherwise in `config.kit.vite.mode`.
- `prerendering` is `true` when [prerendering](#ssr-and-javascript-prerender), `false` otherwise

### $app/navigation

```js
import { goto, invalidate, prefetch, prefetchRoutes } from '$app/navigation';
```

- `goto(href, { replaceState, noscroll, keepfocus, state })` returns a `Promise` that resolves when SvelteKit navigates (or fails to navigate, in which case the promise rejects) to the specified `href`. The second argument is optional:
  - `replaceState` (boolean, default `false`) If `true`, will replace the current `history` entry rather than creating a new one with `pushState`
  - `noscroll` (boolean, default `false`) If `true`, the browser will maintain its scroll position rather than scrolling to the top of the page after navigation
  - `keepfocus` (boolean, default `false`) If `true`, the currently focused element will retain focus after navigation. Otherwise, focus will be reset to the body
  - `state` (object, default `{}`) The state of the new/updated history entry
- `invalidate(resource, custom)` causes any `load` functions belonging to the currently active page to re-run if they `fetch` or `use` the resource in question. If `custom` is `false` (default) `resource` is a URL that was requested with `fetch`. If `true` resource is a custom identifier registered with `uses(resource)` inside `load`. `invalidate` returns a `Promise` that resolves when the page is subsequently updated.
- `prefetch(href)` programmatically prefetches the given page, which means a) ensuring that the code for the page is loaded, and b) calling the page's `load` function with the appropriate options. This is the same behaviour that SvelteKit triggers when the user taps or mouses over an `<a>` element with [sveltekit:prefetch](#anchor-options-sveltekit-prefetch). If the next navigation is to `href`, the values returned from `load` will be used, making navigation instantaneous. Returns a `Promise` that resolves when the prefetch is complete.
- `prefetchRoutes(routes)` — programmatically prefetches the code for routes that haven't yet been fetched. Typically, you might call this to speed up subsequent navigation. If no argument is given, all routes will be fetched; otherwise, you can specify routes by any matching pathname such as `/about` (to match `src/routes/about.svelte`) or `/blog/*` (to match `src/routes/blog/[slug].svelte`). Unlike `prefetch`, this won't call `load` for individual pages. Returns a `Promise` that resolves when the routes have been prefetched.

### $app/paths

```js
import { base, assets } from '$app/paths';
```

- `base` — a root-relative (i.e. begins with a `/`) string that matches [`config.kit.paths.base`](#configuration-paths), or the empty string if unspecified
- `assets` — an absolute URL that matches [`config.kit.paths.assets`](#configuration-paths), if specified, otherwise equal to `base`

> If a value for `config.kit.paths.assets` is specified, it will be replaced with `'/_svelte_kit_assets'` during [`svelte-kit dev`](#command-line-interface-svelte-kit-dev) or [`svelte-kit preview`](#command-line-interface-svelte-kit-preview), since the assets don't yet live at their eventual URL.

### $app/stores

```js
import { getStores, navigating, page, session } from '$app/stores';
```

Stores are _contextual_ — they are added to the [context](https://svelte.dev/tutorial/context-api) of your root component. This means that `session` and `page` are unique to each request on the server, rather than shared between multiple requests handled by the same server simultaneously, which is what makes it safe to include user-specific data in `session`.

Because of that, the stores are not free-floating objects: they must be accessed during component initialisation, like anything else that would be accessed with `getContext`.

- `getStores` is a convenience function around `getContext` that returns `{ navigating, page, session }`. This needs to be called at the top-level or synchronously during component or page initialisation.

The stores themselves attach to the correct context at the point of subscription, which means you can import and use them directly in components without boilerplate. However, it still needs to be called synchronously on component or page initialisation when `$`-prefix isn't used. Use `getStores` to safely `.subscribe` asynchronously instead.

- `navigating` is a [readable store](https://svelte.dev/tutorial/readable-stores). When navigating starts, its value is `{ from, to }`, where `from` and `to` both mirror the `page` store value. When navigating finishes, its value reverts to `null`.
- `page` is a readable store whose value reflects the object passed to `load` functions — it contains `host`, `path`, `params` and `query`. See the [`page` section](#loading-input-page) above for more details.
- `session` is a [writable store](https://svelte.dev/tutorial/writable-stores) whose initial value is whatever was returned from [`getSession`](#hooks-getsession). It can be written to, but this will _not_ cause changes to persist on the server — this is something you must implement yourself.

### $lib

This is a simple alias to `src/lib`, or whatever directory is specified as [`config.kit.files.lib`]. It allows you to access common components and utility modules without `../../../../` nonsense.

### $service-worker

This module is only available to [service workers](#service-workers).

```js
import { build, files, timestamp } from '$service-worker';
```

- `build` is an array of URL strings representing the files generated by Vite, suitable for caching with `cache.addAll(build)`
- `files` is an array of URL strings representing the files in your `static` directory, or whatever directory is specified by [`config.kit.files.assets`](#configuration). You can exclude certain files from `static` directory using [`config.kit.serviceWorker.exclude`](#configuration)
- `timestamp` is the result of calling `Date.now()` at build time. It's useful for generating unique cache names inside your service worker, so that a later deployment of your app can invalidate old caches
