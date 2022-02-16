---
title: Page options
---

By default, SvelteKit will render any component first on the server and send it to the client as HTML. It will then render the component again in the browser to make it interactive in a process called **hydration**. For this reason, you need to ensure that components can run in both places. SvelteKit will then initialise a [**router**](/docs/routing) that takes over subsequent navigations.

You can control each of these on a per-app or per-page basis. Note that each of the per-page settings use [`context="module"`](https://svelte.dev/docs#component-format-script-context-module), and only apply to pages, _not_ [layouts](/docs/layouts).

If both are specified, per-page settings override per-app settings in case of conflicts.

### router

SvelteKit includes a [client-side router](/docs/appendix#routing) that intercepts navigations (from the user clicking on links, or interacting with the back/forward buttons) and updates the page contents, rather than letting the browser handle the navigation by reloading.

In certain circumstances you might need to disable [client-side routing](/docs/appendix#routing) with the app-wide [`browser.router` config option](/docs/configuration#browser) or the page-level `router` export:

```html
<script context="module">
	export const router = false;
</script>
```

Note that this will disable client-side routing for any navigation from this page, regardless of whether the router is already active.

### hydrate

Ordinarily, SvelteKit [hydrates](/docs/appendix#hydration) your server-rendered HTML into an interactive page. Some pages don't require JavaScript at all — many blog posts and 'about' pages fall into this category. In these cases you can skip hydration when the app boots up with the app-wide [`browser.hydrate` config option](/docs/configuration#browser) or the page-level `hydrate` export:

```html
<script context="module">
	export const hydrate = false;
</script>
```

> If `hydrate` and `router` are both `false`, SvelteKit will not add any JavaScript to the page at all. If [server-side rendering](/docs/hooks#handle) is disabled in `handle`, `hydrate` must be `true` or no content will be rendered.

### prerender

It's likely that at least some pages of your app can be represented as a simple HTML file generated at build time. These pages can be [_prerendered_](/docs/appendix#prerendering) by your [adapter](/docs/adapters).

If your entire app is suitable for prerendering, you could use [`adapter-static`](https://github.com/sveltejs/kit/tree/master/packages/adapter-static), which will generate HTML files for every page, plus additional files that are requested by `load` functions in those pages.

In many cases, you'll only want to prerender specific pages in your app. You'll need to annotate these pages:

```html
<script context="module">
	export const prerender = true;
</script>
```

The prerenderer will start at the root of your app and generate HTML for any prerenderable pages it finds. Each page is scanned for `<a>` elements that point to other pages that are candidates for prerendering — because of this, you generally don't need to specify which pages should be accessed. If you _do_ need to specify which pages should be accessed by the prerenderer, you can do so with the `entries` option in the [prerender configuration](/docs/configuration#prerender).

#### When not to prerender

The basic rule is this: for a page to be prerenderable, any two users hitting it directly must get the same content from the server.

> Not all pages are suitable for prerendering. Any content that is prerendered will be seen by all users. You can of course fetch personalized data in `onMount` in a prerendered page, but this may result in a poorer user experience since it will involve blank initial content or loading indicators.

Note that you can still prerender pages that load data based on the page's parameters, like our `src/routes/blog/[slug].svelte` example from earlier. The prerenderer will intercept requests made inside `load`, so the data served from `src/routes/blog/[slug].json.js` will also be captured.

Accessing [`url.searchParams`](/docs/loading#input-url) during prerendering is forbidden. If you need to use it, ensure you are only doing so in the browser (for example in `onMount`).

#### Route conflicts

Because prerendering writes to the filesystem, it isn't possible to have two endpoints that would cause a directory and a file to have the same name. For example, `src/routes/foo/index.js` and `src/routes/foo/bar.js` would try to create `foo` and `foo/bar`, which is impossible.

For that reason among others, it's recommended that you always include a file extension — `src/routes/foo/index.json.js` and `src/routes/foo/bar.json.js` would result in `foo.json` and `foo/bar.json` files living harmoniously side-by-side.

For _pages_, we skirt around this problem by writing `foo/index.html` instead of `foo`.
