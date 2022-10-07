---
title: Page options
---

By default, SvelteKit will render (or [prerender](/docs/appendix#prerendering)) any component first on the server and send it to the client as HTML. It will then render the component again in the browser to make it interactive in a process called **hydration**. For this reason, you need to ensure that components can run in both places. SvelteKit will then initialize a [**router**](/docs/routing) that takes over subsequent navigations.

You can control each of these on a page-by-page basis by exporting options from [`+page.js`](/docs/routing#page-page-js) or [`+page.server.js`](/docs/routing#page-page-server-js), or for groups of pages using a shared [`+layout.js`](/docs/routing#layout-layout-js) or [`+layout.server.js`](/docs/routing#layout-layout-server-js). To define an option for the whole app, export it from the root layout. Child layouts and pages override values set in parent layouts, so — for example — you can enable prerendering for your entire app then disable it for pages that need to be dynamically rendered.

### prerender

It's likely that at least some routes of your app can be represented as a simple HTML file generated at build time. These routes can be [_prerendered_](/docs/appendix#prerendering).

```js
/// file: +page.js/+page.server.js/+server.js
export const prerender = true;
```

Alternatively, you can set `export const prerender = true` in your root `+layout.js` or `+layout.server.js` and prerender everything except pages that are explicitly marked as _not_ prerenderable:

```js
/// file: +page.js/+page.server.js/+server.js
export const prerender = false;
```

Routes with `prerender = true` will be excluded from manifests used for dynamic SSR, making your server (or serverless/edge functions) smaller. In some cases you might want to prerender a route but also include it in the manifest (for example, with a route like `/blog/[slug]` where you want to prerender your most recent/popular content but server-render the long tail) — for these cases, there's a third option, 'auto':

```js
/// file: +page.js/+page.server.js/+server.js
export const prerender = 'auto';
```

> If your entire app is suitable for prerendering, you can use [`adapter-static`](https://github.com/sveltejs/kit/tree/master/packages/adapter-static), which will output files suitable for use with any static webserver.

The prerenderer will start at the root of your app and generate files for any prerenderable pages or `+server.js` routes it finds. Each page is scanned for `<a>` elements that point to other pages that are candidates for prerendering — because of this, you generally don't need to specify which pages should be accessed. If you _do_ need to specify which pages should be accessed by the prerenderer, you can do so with the `entries` option in the [prerender configuration](/docs/configuration#prerender).

#### Prerendering server routes

Unlike the other page options, `prerender` also applies to `+server.js` files. These files are _not_ affected from layouts, but will inherit default values from the pages that fetch data from them, if any. For example if a `+page.js` contains this `load` function...

```js
/// file: +page.js
export const prerender = true;

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const res = await fetch('/my-server-route.json');
	return await res.json();
}
```

...then `src/routes/my-server-route.json/+server.js` will be treated as prerenderable if it doesn't contain its own `export const prerender = false`.

#### When not to prerender

The basic rule is this: for a page to be prerenderable, any two users hitting it directly must get the same content from the server.

> Not all pages are suitable for prerendering. Any content that is prerendered will be seen by all users. You can of course fetch personalized data in `onMount` in a prerendered page, but this may result in a poorer user experience since it will involve blank initial content or loading indicators.

Note that you can still prerender pages that load data based on the page's parameters, such as a `src/routes/blog/[slug]/+page.svelte` route.

Accessing [`url.searchParams`](/docs/load#using-url-data-url) during prerendering is forbidden. If you need to use it, ensure you are only doing so in the browser (for example in `onMount`).

#### Route conflicts

Because prerendering writes to the filesystem, it isn't possible to have two endpoints that would cause a directory and a file to have the same name. For example, `src/routes/foo/+server.js` and `src/routes/foo/bar/+server.js` would try to create `foo` and `foo/bar`, which is impossible.

For that reason among others, it's recommended that you always include a file extension — `src/routes/foo.json/+server.js` and `src/routes/foo/bar.json/+server.js` would result in `foo.json` and `foo/bar.json` files living harmoniously side-by-side.

For _pages_, we skirt around this problem by writing `foo/index.html` instead of `foo`.

Note that this will disable client-side routing for any navigation from this page, regardless of whether the router is already active.

#### Troubleshooting

If you encounter an error like 'The following routes were marked as prerenderable, but were not prerendered' it's because the route in question (or a parent layout, if it's a page) has `export const prerender = true` but the page wasn't actually prerendered.

Since these routes cannot be dynamically server-rendered, this will cause errors when people try to access the route in question. There are two ways to fix it:

* Ensure that SvelteKit can find the route by following links from [`config.kit.prerender.entries`](/docs/configuration#prerender). The pages containing the links (e.g. your `/` page) must _themselves_ be prerenderable, or they will be ignored
* Change `export const prerender = true` to `export const prerender = 'auto'`. Routes with `'auto'` can be dynamically server rendered

### ssr

Normally, SvelteKit renders your page on the server first and sends that HTML to the client where it's hydrated. If you set `ssr` to `false`, it renders an empty 'shell' page instead. This is useful if your page is unable to be rendered on the server, but in most situations it's not recommended ([see appendix](/docs/appendix#ssr)). If you put this into your root `+layout.js`, you create an SPA (all pages are client-side rendered only).

```js
/// file: +page.js
export const ssr = false;
```

### csr

Ordinarily, SvelteKit [hydrates](/docs/appendix#hydration) your server-rendered HTML into an interactive client-side-rendered (CSR) page. Some pages don't require JavaScript at all — many blog posts and 'about' pages fall into this category. In these cases you can disable CSR:

```js
/// file: +page.js
export const csr = false;
```

> If both `ssr` and `csr` are `false`, nothing will be rendered!
