---
title: SSR and JavaScript
---

By default, SvelteKit will server-render pages on-demand, then **hydrate** the rendered HTML in the client with an interactive Svelte app while initialising a **router** that takes over subsequent navigations.

You can control each of these on a per-app or per-page basis. Note that each of the per-page settings use [`context="module"`](https://svelte.dev/docs#script_context_module), and only apply to page components, _not_ [layout](#layouts) components.

If both are specified, per-page settings override per-app settings in case of conflicts. Each setting can be controlled independently, but `ssr` and `hydrate` cannot both be `false` since that would result in nothing being rendered at all.

### ssr

Disabling server-side rendering effectively turns your SvelteKit app into a **single-page app** or SPA.

> In most situations this is not recommended: it harms SEO, tends to slow down perceived performance, and makes your app inaccessible to users if JavaScript fails or is disabled (which happens [more often than you probably think](https://kryogenix.org/code/browser/everyonehasjs.html)). Sometimes it's appropriate or even necessary, but consider alternatives before disabling SSR.

You can disable SSR app-wide with the [`ssr` config option](#configuration-ssr), or a page-level `ssr` export:

```html
<script context="module">
	export const ssr = false;
</script>
```

### router

SvelteKit includes a client-side router that intercepts navigations (from the user clicking on links, or interacting with the back/forward buttons) and updates the page contents, rather than letting the browser handle the navigation by reloading.

In certain circumstances you might need to disable this behaviour with the app-wide [`router` config option](#configuration-router) or the page-level `router` export:

```html
<script context="module">
	export const router = false;
</script>
```

### hydrate

Ordinarily, SvelteKit 'hydrates' your server-rendered HTML into an interactive page. Some pages don't require JavaScript at all — many blog posts and 'about' pages fall into this category. In these cases you can skip hydration when the app boots up with the app-wide [`hydrate` config option](#configuration-hydrate) or the page-level `hydrate` export:

```html
<script context="module">
	export const hydrate = false;
</script>
```

> If `hydrate` and `router` are both `false`, SvelteKit will not add any JavaScript to the page at all.

### prerender

It's likely that at least some pages of your app can be represented as a simple HTML file, since they contain no dynamic or user-specific data. These pages can be _prerendered_ by your [adapter](#adapters).

If your entire app is suitable for prerendering, you could use [`adapter-static`](https://github.com/sveltejs/kit/tree/master/packages/adapter-static), which will generate HTML files for every page, plus additional files that are requested by `load` functions in those pages.

More likely, you'll only want to prerender specific pages in your app. You'll need to annotate these pages:

```html
<script context="module">
	export const prerender = true;
</script>
```

The prerenderer will start at the root of your app and generate HTML for any prerenderable pages it finds. Each page is scanned for `<a>` elements that point to other pages that are candidates for prerendering — because of this, you generally don't need to specify which pages should be accessed. If you _do_ need to specify which pages should be accessed by the prerenderer, you can do so with the `pages` option in the [prerender configuration](#configuration-prerender).

#### When not to prerender

The basic rule is this: for a page to be prerenderable, any two users hitting the same page of your app must get the same content from the server. In other words, any app that involves user sessions or authentication is _not_ a candidate for the static adapter.

Note that you can still prerender pages that load data based on the page's parameters, like our `src/routes/blog/[slug].svelte` example from earlier. The static adapter will intercept requests made inside `load`, so the data served from `src/routes/blog/[slug].json.js` will also be captured.

#### Route conflicts

Because prerendering writes to the filesystem, it isn't possible to have two endpoints that would cause a directory and a file to have the same name. For example, `src/routes/foo/index.js` and `src/routes/foo/bar.js` would try to create `foo` and `foo/bar`, which is impossible.

For that reason among others, it's recommended that you always include a file extension — `src/routes/foo/index.json.js` and `src/routes/foo/bar.json.js` would result in `foo.json` and `foo/bar.json` files living harmoniously side-by-side.

For _pages_, we skirt around this problem by writing `foo/index.html` instead of `foo`.
