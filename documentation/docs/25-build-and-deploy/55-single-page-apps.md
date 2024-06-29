---
title: Single-page apps
---

You can turn a SvelteKit app into a fully client-rendered single-page app (SPA) by specifying a _fallback page_ that will be served for any URLs that can't be served via another means such as by returning a prerendered page.

> SPA mode has a large negative performance impact by forcing two network round trips before rendering can begin. This may be acceptable if you are serving an application from the local network (e.g. a mobile app that wraps a locally-served SPA), but probably is not for most websites on the internet especially when considering the latency of mobile devices. It also harms SEO by often causing sites to be downranked for performance (SPAs are much more likely to fail core web vitals), excluding search engines that don't render JS, and causing your site to receive less frequent updates from those that do. And finally, it makes your app inaccessible to users if JavaScript fails or is disabled (which happens [more often than you probably think](https://kryogenix.org/code/browser/everyonehasjs.html)).
>
> You can avoid these drawbacks on a given page by [prerendering it](#prerendering-individual-pages). You should thus prerender as many pages as possible when using SPA mode — especially your homepage. If you can prerender all pages, you can simply use [static site generation](adapter-static) rather than a SPA. If you cannot, you should strongly consider using an adapter which supports server side rendering — SvelteKit offers officially supported adapters for multiple different providers that offer free SSR hosting for sites below a certain threshold.

## Usage

First, disable SSR for the pages you don't want to prerender. These pages will be seved via a fallback page. E.g. to serve all pages via the fallback by default, you can update the root layout as shown below. You should [opt back into prerendering individual pages and directories](#prerendering-individual-pages) where possible.
```js
/// file: src/routes/+layout.js
export const ssr = false;
```

If you don't have any server-side logic (i.e. `+page.server.js`, `+layout.server.js` or `+server.js` files) you can use [`adapter-static`](adapter-static) to create your SPA. Install `adapter-static` with `npm i -D @sveltejs/adapter-static` and add it to your `svelte.config.js` with the `fallback` option:

```js
// @errors: 2307
/// file: svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
	kit: {
		adapter: adapter({
			fallback: '200.html' // may differ from host to host
		})
	}
};
```

The `fallback` page is an HTML page created by SvelteKit from your page template (e.g. `app.html`) that loads your app and navigates to the correct route. For example [Surge](https://surge.sh/help/adding-a-200-page-for-client-side-routing), a static web host, lets you add a `200.html` file that will handle any requests that don't correspond to static assets or prerendered pages.

On some hosts it may be something else entirely — consult your platform's documentation. We recommend avoiding `index.html` if possible as it may conflict with prerendering.

> Note that the fallback page will always contain absolute asset paths (i.e. beginning with `/` rather than `.`) regardless of the value of [`paths.relative`](/docs/configuration#paths), since it is used to respond to requests for arbitrary paths.

## Prerendering individual pages

If you want certain pages to be prerendered, you can re-enable `ssr` alongside `prerender` for just those parts of your app:

```js
/// file: src/routes/my-prerendered-page/+page.js
export const prerender = true;
export const ssr = true;
```

You won't need a Node server or server capable of running JavaScript to deploy this page. It will only server render your page while building your project for the purposes of outputting an `.html` page that can be served from any static web host.

## Apache

To run an SPA on [Apache](https://httpd.apache.org/), you should add a `static/.htaccess` file to route requests to the fallback page:

```
<IfModule mod_rewrite.c>
	RewriteEngine On
	RewriteBase /
	RewriteRule ^200\.html$ - [L]
	RewriteCond %{REQUEST_FILENAME} !-f
	RewriteCond %{REQUEST_FILENAME} !-d
	RewriteRule . /200.html [L]
</IfModule>
```
