---
title: SEO
---

The most important aspect of SEO is to create high-quality content that is widely linked to from around the web. However, there are a few technical considerations for building sites that rank well.

### Out of the box

#### SSR

While search engines have got better in recent years at indexing content that was rendered with client-side JavaScript, server-side rendered content is indexed more frequently and reliably. SvelteKit employs SSR by default, and while you can disable it in [`handle`](/docs/hooks#handle), you should leave it on unless you have a good reason not to.

> SvelteKit's rendering is highly configurable and you can implement [dynamic rendering](https://developers.google.com/search/docs/advanced/javascript/dynamic-rendering) if necessary. It's not generally recommended, since SSR has other benefits beyond SEO.

#### Performance

Signals such as [Core Web Vitals](https://web.dev/vitals/#core-web-vitals) impact search engine ranking. Because Svelte and SvelteKit introduce minimal overhead, it's easier to build high performance sites.

#### Normalized URLs

SvelteKit redirects URLs with trailing slashes to versions without trailing slash or vice versa depending on your [configuration](configuration#trailingslash).

### SEO setup

#### `meta` tags

It is generally recommended to add `meta` HTML tags to your page. These can be created just as any other Svelte element. The Svelte Society website has an [example](https://github.com/svelte-society/sveltesociety.dev/blob/staging/src/lib/components/Seo.svelte). You may also find the [`stuff`](loading#input-stuff) feature as helpful for constructing `meta` tags in some cases where you want to pass content from a page to a layout.

#### Structured data

[Structured data](https://developers.google.com/search/docs/advanced/structured-data/intro-structured-data) helps search engines understand the content of a page. If you're using structured data alongside [`svelte-preprocess`](https://github.com/sveltejs/svelte-preprocess), you will need to explicitly preserve `ld+json` data (this [may change in future](https://github.com/sveltejs/svelte-preprocess/issues/305)):


#### Sitemaps

[Sitemaps](https://developers.google.com/search/docs/advanced/sitemaps/build-sitemap) help search engines prioritize pages within your site, particularly when you have a large amount of content. You can create a sitemap dynamically using a `src/routes/sitemap.xml.js` endpoint:

```js
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

#### AMP

An unfortunate reality of modern web development is that it is sometimes necessary to create an [AMP](https://amp.dev/) version of your site. In SvelteKit this can be done by setting the [`amp`](/docs/configuration#amp) config option, which has the following effects:

- Client-side JavaScript, including the router, is disabled
- Styles are concatenated into `<style amp-custom>`, and the [AMP boilerplate](https://amp.dev/boilerplate/) is injected
- In development, requests are checked against the [AMP validator](https://validator.ampproject.org/) so you get early warning of any errors
