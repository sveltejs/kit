---
title: Prerendering
---

It's likely that at least some pages of your app can be represented as a simple HTML file, since they contain no dynamic or user-specific data. These pages can be *prerendered* by your [adapter](#adapters).

If your entire app is suitable for prerendering, you could use [`adapter-static`](https://github.com/sveltejs/kit/tree/master/packages/adapter-static), which will generate HTML files for every page, plus additional files that are requested by `load` functions in those pages.

More likely, you'll only want to prerender specific pages in your app. You'll need to annotate these pages:

```html
<script context="module">
	export const prerender = true;
</script>
```

The prerenderer will start at the root of your app and generate HTML for any prerenderable pages it finds. Each page is scanned for `<a>` elements that point to other pages that are candidates for prerendering — because of this, you generally don't need to specify which pages should be accessed. If you _do_ need to specify which pages should be accessed by the prerenderer, you can do so with the `pages` option in the [prerender configuration](#configuration-prerender).

### When not to prerender

The basic rule is this: for a page to be prerenderable, any two users hitting the same page of your app must get the same content from the server. In other words, any app that involves user sessions or authentication is _not_ a candidate for the static adapter.

Note that you can still prerender pages that load data based on the page's parameters, like our `src/routes/blog/[slug].svelte` example from earlier. The static adapter will intercept requests made inside `load`, so the data served from `src/routes/blog/[slug].json.js` will also be captured.

### Route conflicts

Because prerendering writes to the filesystem, it isn't possible to have two endpoints that would cause a directory and a file to have the same name. For example, `src/routes/foo/index.js` and `src/routes/foo/bar.js` would try to create `foo` and `foo/bar`, which is impossible.

For that reason among others, it's recommended that you always include a file extension — `src/routes/foo/index.json.js` and `src/routes/foo/bar.json.js` would result in `foo.json` and `foo/bar.json` files living harmoniously side-by-side.

For _pages_, we skirt around this problem by writing `foo/index.html` instead of `foo`.