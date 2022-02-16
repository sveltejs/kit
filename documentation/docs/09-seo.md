---
title: SEO
---

The most important aspect of SEO is to create high-quality content that is widely linked to from around the web. However, there are a few technical considerations for building sites that rank well.

### Out of the box

#### SSR

While search engines have got better in recent years at indexing content that was rendered with client-side JavaScript, server-side rendered content is indexed more frequently and reliably. SvelteKit employs SSR by default, and while you can disable it in [`handle`](/docs/hooks#handle), you should leave it on unless you have a good reason not to.

> SvelteKit's rendering is highly configurable and you can implement [dynamic rendering](https://developers.google.com/search/docs/advanced/javascript/dynamic-rendering) if necessary. It's not generally recommended, since SSR has other benefits beyond SEO.

#### Performance

Search engines take site performance into account as a ranking factor. [Web Vitals](https://web.dev/vitals/) is a term coined by Google to provide performance metrics regarding a site's load speed. [Google takes the Core Web Vitals into account](https://developers.google.com/search/blog/2020/11/timing-for-page-experience) in deciding which sites to show at the top of the rankings.

SvelteKit is optimized to give great scores out-of-the-box. Check out [how this site performs on Google PageSpeed Insights](https://pagespeed.web.dev/report?url=https%3A%2F%2Fkit.svelte.dev%2F). We invite you to compare against sites built with other frameworks. If scores on your site are not high, we recommend trying to minimize the size of included dependencies and to use the developer tools provided by your browser to diagnose.

#### Canonicalized URLs

SvelteKit redirects URLs with trailing slashes to versions without trailing slash or vice versa depending on your [configuration](configuration#trailingslash).

### SEO setup

#### `meta` tags

It is generally recommended to add `meta` HTML tags to your page. These can be created just as any other Svelte element. The Svelte Society website has an [example](https://github.com/svelte-society/sveltesociety.dev/blob/staging/src/lib/components/Seo.svelte). You may also find the [`stuff`](loading#input-stuff) feature as helpful for constructing `meta` tags in some cases where you want to pass content from a page to a layout.

#### Structured data

There is not too much special you need to do in SvelteKit to provide structured data, so we recommend that you reference [Google's documentation regarding structured data](https://developers.google.com/search/docs/advanced/structured-data/intro-structured-data). If you're using `svelte-preprocess`, please note that [you'll currently need to use the `preserve` option](https://github.com/sveltejs/svelte-preprocess/issues/305):

```
	preprocess: sveltePreprocess({
		preserve: ['ld+json']
	})
```

#### Sitemaps

Sitemaps can be used to help search engines properly prioritize crawling on your site and are most useful when your site is really large. Frontend frameworks have no way of knowing what content on your site might have been recently added or updated, so this is largely something you'll have to create yourself. You can create an endpoint that dynamically generates a sitemap according to [the sitemap specification](https://www.sitemaps.org/protocol.html) by reading from your content source such as an API or database and then outputting the appropriate XML content. If you're building a site hosting video, images, or news you may also want to consider adding [sitemap extensions](https://developers.google.com/search/docs/advanced/sitemaps/build-sitemap#extensions).

Here's a `src/routes/sitemap.xml.js` endpoint that returns an empty sitemap with multimedia support to get you started:
```js
export async function get() {
	const headers = {
		'Content-Type': 'application/xml',
	};
	return {
		headers,
		body: `<?xml version="1.0" encoding="UTF-8" ?>
		<urlset
			xmlns="https://www.sitemaps.org/schemas/sitemap/0.9"
			xmlns:xhtml="https://www.w3.org/1999/xhtml"
			xmlns:mobile="https://www.google.com/schemas/sitemap-mobile/1.0"
			xmlns:news="https://www.google.com/schemas/sitemap-news/0.9"
			xmlns:image="https://www.google.com/schemas/sitemap-image/1.1"
			xmlns:video="https://www.google.com/schemas/sitemap-video/1.1"
		></urlset>`,
	};
}
```

#### AMP

An unfortunate reality of modern web development is that it is sometimes necessary to create an [AMP](https://amp.dev/) version of your site. In SvelteKit this can be done by setting the [`amp`](/docs/configuration#amp) config option, which has the following effects:

- Client-side JavaScript, including the router, is disabled
- Styles are concatenated into `<style amp-custom>`, and the [AMP boilerplate](https://amp.dev/boilerplate/) is injected
- In development, requests are checked against the [AMP validator](https://validator.ampproject.org/) so you get early warning of any errors
