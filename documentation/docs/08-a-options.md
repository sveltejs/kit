---
title: Anchor options
---

### sveltekit:prefetch

SvelteKit uses code splitting to break your app into small chunks (one per route), ensuring fast startup times.

For _dynamic_ routes, such as our `src/routes/blog/[slug].svelte` example, that's not enough. In order to render the blog post, we need to fetch the data for it, and we can't do that until we know what `slug` is. In the worst case, that could cause lag as the browser waits for the data to come back from the server.

We can mitigate that by _prefetching_ the data. Adding a `sveltekit:prefetch` attribute to a link...

```html
<a sveltekit:prefetch href="blog/what-is-sveltekit">What is SvelteKit?</a>
```

...will cause SvelteKit to run the page's `load` function as soon as the user hovers over the link (on a desktop) or touches it (on mobile), rather than waiting for the `click` event to trigger navigation. Typically, this buys us an extra couple of hundred milliseconds, which is the difference between a user interface that feels laggy, and one that feels snappy.

Note that prefetching will not work if the [`router`](/docs/page-options#router) setting is `false`.

You can also programmatically invoke `prefetch` from `$app/navigation`.

### sveltekit:reload

By default, the SvelteKit runtime intercepts clicks on `<a>` elements and bypasses the normal browser navigation for relative (same-origin) URLs that match one of your page routes. We sometimes need to tell SvelteKit that certain links need to be handled by normal browser navigation. Examples of this might be linking to another page on your domain that's not part of your SvelteKit app or linking to an endpoint.

Adding a `sveltekit:reload` attribute to a link...

```html
<a sveltekit:reload href="path">Path</a>
```

...will cause browser to navigate via a full page reload when the link is clicked.

Links with a `rel="external"` attribute will receive the same treatment. In addition, they will be ignored during [prerendering](https://kit.svelte.dev/docs/page-options#prerender).

### sveltekit:noscroll

When navigating to internal links, SvelteKit mirrors the browser's default navigation behaviour: it will change the scroll position to 0,0 so that the user is at the very top left of the page (unless the link includes a `#hash`, in which case it will scroll to the element with a matching ID).

In certain cases, you may wish to disable this behaviour. Adding a `sveltekit:noscroll` attribute to a link...

```html
<a href="path" sveltekit:noscroll>Path</a>
```

...will prevent scrolling after the link is clicked.
