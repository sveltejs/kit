---
title: SEO
---

The most important aspect of SEO is to create high-quality content that is widely linked to from around the web. However, there are a few technical considerations for building sites that rank well.

### Out of the box

#### SSR

While search engines have got better in recent years at indexing content that was rendered with client-side JavaScript, server-side rendered content is indexed more frequently and reliably. SvelteKit employs SSR by default, and while you can disable it in [`handle`](/docs/hooks#handle), you should leave it on unless you have a good reason not to.

> SvelteKit's rendering is highly configurable and you can implement [dynamic rendering](https://developers.google.com/search/docs/advanced/javascript/dynamic-rendering) if necessary. It's not generally recommended, since SSR has other benefits beyond SEO.

#### Performance

Signals such as [Core Web Vitals](https://web.dev/vitals/#core-web-vitals) impact search engine ranking. Because Svelte and SvelteKit introduce minimal overhead, it's easier to build high performance sites. You can test your site's performance using Google's [PageSpeed Insights](https://pagespeed.web.dev/) or [Lighthouse](https://developers.google.com/web/tools/lighthouse).

#### Normalized URLs

SvelteKit redirects pathnames with trailing slashes to ones without (or vice versa depending on your [configuration](configuration#trailingslash)), as duplicate URLs are bad for SEO.

### Manual setup

#### `title` and `meta`

Every page should have well-written and unique `<title>` and `<meta name="description">` elements inside a [`<svelte:head>`](https://svelte.dev/docs#template-syntax-svelte-head). Guidance on how to write descriptive titles and descriptions, along with other suggestions on making content understandable by search engines, can be found on Google's [Lighthouse SEO audits](https://web.dev/lighthouse-seo/) documentation.

> A common pattern is to return SEO-related [`stuff`](/docs/loading#output-stuff) from page `load` functions, then use it (as [`$page.stuff`](/docs/modules#$app-stores)) in a `<svelte:head>` in your root [layout](/docs/layouts).

#### Structured data

[Structured data](https://developers.google.com/search/docs/advanced/structured-data/intro-structured-data) helps search engines understand the content of a page. If you're using structured data alongside [`svelte-preprocess`](https://github.com/sveltejs/svelte-preprocess), you will need to explicitly preserve `ld+json` data (this [may change in future](https://github.com/sveltejs/svelte-preprocess/issues/305)):

```js
/// file: svelte.config.js
// @filename: ambient.d.ts
declare module 'svelte-preprocess';

// @filename: index.js
// ---cut---
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: preprocess({
		preserve: ['ld+json']
		// ...
	})
};

export default config;
```

#### Sitemaps

[Sitemaps](https://developers.google.com/search/docs/advanced/sitemaps/build-sitemap) help search engines prioritize pages within your site, particularly when you have a large amount of content. You can create a sitemap dynamically using an endpoint:

```js
/// file: src/routes/sitemap.xml.js
export async function get() {
	return {
		headers: {
			'Content-Type': 'application/xml'
		},
		body: `
			<?xml version="1.0" encoding="UTF-8" ?>
			<urlset
				xmlns="https://www.sitemaps.org/schemas/sitemap/0.9"
				xmlns:xhtml="https://www.w3.org/1999/xhtml"
				xmlns:mobile="https://www.google.com/schemas/sitemap-mobile/1.0"
				xmlns:news="https://www.google.com/schemas/sitemap-news/0.9"
				xmlns:image="https://www.google.com/schemas/sitemap-image/1.1"
				xmlns:video="https://www.google.com/schemas/sitemap-video/1.1"
			>
				<!-- <url> elements go here -->
			</urlset>
		`.trim()
	};
}
```

#### AMP

An unfortunate reality of modern web development is that it is sometimes necessary to create an [Accelerated Mobile Pages (AMP)](https://amp.dev/) version of your site. In SvelteKit this can be done by setting the [`amp`](/docs/configuration#amp) config option, which has the following effects:

- Client-side JavaScript, including the router, is disabled
- Styles are concatenated into `<style amp-custom>`, and the [AMP boilerplate](https://amp.dev/boilerplate/) is injected
- In development, requests are checked against the [AMP validator](https://validator.ampproject.org/) so you get early warning of any errors
