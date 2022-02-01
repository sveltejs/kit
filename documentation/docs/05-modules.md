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
- `prerendering` is `true` when [prerendering](#page-options-prerender), `false` otherwise

### $app/navigation

```js
import {
	disableScrollHandling,
	goto,
	invalidate,
	prefetch,
	prefetchRoutes,
	beforeNavigate,
	afterNavigate
} from '$app/navigation';
```

- `afterNavigate(({ from, to }: { from: URL, to: URL }) => void)` - a lifecycle function that runs when the components mounts, and after subsequent navigations while the component remains mounted
- `beforeNavigate(({ from, to, cancel }: { from: URL, to: URL | null, cancel: () => void }) => void)` — a function that runs whenever navigation is triggered whether by clicking a link, calling `goto`, or using the browser back/forward controls. This includes navigation to external sites. `to` will be `null` if the user is closing the page. Calling `cancel` will prevent the navigation from proceeding
- `disableScrollHandling` will, if called when the page is being updated following a navigation (in `onMount` or an action, for example), prevent SvelteKit from applying its normal scroll management. You should generally avoid this, as breaking user expectations of scroll behaviour can be disorienting.
- `goto(href, { replaceState, noscroll, keepfocus, state })` returns a `Promise` that resolves when SvelteKit navigates (or fails to navigate, in which case the promise rejects) to the specified `href`. The second argument is optional:
  - `replaceState` (boolean, default `false`) If `true`, will replace the current `history` entry rather than creating a new one with `pushState`
  - `noscroll` (boolean, default `false`) If `true`, the browser will maintain its scroll position rather than scrolling to the top of the page after navigation
  - `keepfocus` (boolean, default `false`) If `true`, the currently focused element will retain focus after navigation. Otherwise, focus will be reset to the body
  - `state` (object, default `{}`) The state of the new/updated history entry
- `invalidate(href)` causes any `load` functions belonging to the currently active page to re-run if they `fetch` the resource in question. It returns a `Promise` that resolves when the page is subsequently updated.
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
import { getStores, navigating, page, session, updated } from '$app/stores';
```

Stores are _contextual_ — they are added to the [context](https://svelte.dev/tutorial/context-api) of your root component. This means that `session` and `page` are unique to each request on the server, rather than shared between multiple requests handled by the same server simultaneously, which is what makes it safe to include user-specific data in `session`.

Because of that, the stores are not free-floating objects: they must be accessed during component initialisation, like anything else that would be accessed with `getContext`.

- `getStores` is a convenience function around `getContext` that returns `{ navigating, page, session, updated }`. This needs to be called at the top-level or synchronously during component or page initialisation.

The stores themselves attach to the correct context at the point of subscription, which means you can import and use them directly in components without boilerplate. However, it still needs to be called synchronously on component or page initialisation when the `$`-prefix isn't used. Use `getStores` to safely `.subscribe` asynchronously instead.

- `navigating` is a [readable store](https://svelte.dev/tutorial/readable-stores). When navigating starts, its value is `{ from, to }`, where `from` and `to` are both [`URL`](https://developer.mozilla.org/en-US/docs/Web/API/URL) instances. When navigating finishes, its value reverts to `null`.
- `page` contains an object with the current [`url`](https://developer.mozilla.org/en-US/docs/Web/API/URL), [`params`](#loading-input-params), [`stuff`](#loading-output-stuff), [`status`](#loading-output-status) and [`error`](#loading-output-error).
- `session` is a [writable store](https://svelte.dev/tutorial/writable-stores) whose initial value is whatever was returned from [`getSession`](#hooks-getsession). It can be written to, but this will _not_ cause changes to persist on the server — this is something you must implement yourself.
- `updated` is a [readable store](https://svelte.dev/tutorial/readable-stores) whose initial value is false. If [`version.pollInterval`](#configuration-version) is a non-zero value, SvelteKit will poll for new versions of the app and update the store value to `true` when it detects one. `updated.check()` will force an immediate check, regardless of polling.

### $lib

This is a simple alias to `src/lib`, or whatever directory is specified as [`config.kit.files.lib`]. It allows you to access common components and utility modules without `../../../../` nonsense.

### $service-worker

This module is only available to [service workers](#service-workers).

```js
import { build, files, timestamp } from '$service-worker';
```

- `build` is an array of URL strings representing the files generated by Vite, suitable for caching with `cache.addAll(build)`
- `files` is an array of URL strings representing the files in your `static` directory, or whatever directory is specified by [`config.kit.files.assets`](#configuration). You can customize which files are included from `static` directory using [`config.kit.serviceWorker.files`](#configuration)
- `timestamp` is the result of calling `Date.now()` at build time. It's useful for generating unique cache names inside your service worker, so that a later deployment of your app can invalidate old caches

### @sveltejs/kit/hooks

This module provides a helper function to sequence multiple `handle` calls.

```js
import { sequence } from '@sveltejs/kit/hooks';

async function first({ event, resolve }) {
	console.log('first pre-processing');
	const result = await resolve(event);
	console.log('first post-processing');
	return result;
}
async function second({ event, resolve }) {
	console.log('second pre-processing');
	const result = await resolve(event);
	console.log('second post-processing');
	return result;
}

export const handle = sequence(first, second);
```

The example above would print:
>first pre-processing
>second pre-processing
>second post-processing
>first post-processing
