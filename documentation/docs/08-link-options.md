---
title: Link options
---

### sveltekit:prefetch

SvelteKit uses code splitting to break your app into small chunks (one per route), ensuring fast startup times.

For *dynamic* routes, such as our `src/routes/blog/[slug].svelte` example, that's not enough. In order to render the blog post, we need to fetch the data for it, and we can't do that until we know what `slug` is. In the worst case, that could cause lag as the browser waits for the data to come back from the server.

We can mitigate that by *prefetching* the data. Adding a `rel=prefetch` attribute to a link...

```html
<a rel=prefetch href='blog/what-is-sveltekit'>What is SvelteKit?</a>
```

...will cause SvelteKit to run the page's `preload` function as soon as the user hovers over the link (on a desktop) or touches it (on mobile), rather than waiting for the `click` event to trigger navigation. Typically, this buys us an extra couple of hundred milliseconds, which is the difference between a user interface that feels laggy, and one that feels snappy.

> `rel=prefetch` is a SvelteKit idiom, not a standard attribute for `<a>` elements

<!-- TODO add a function to prefetch programmatically -->

### rel=external

By default, the SvelteKit runtime intercepts clicks on `<a>` elements and bypasses the normal browser navigation for relative (same-origin) URLs that match one of your page routes. We sometimes need to tell SvelteKit that certain links need to be be handled by normal browser navigation.

Adding a `rel=external` attribute to a link...

```html
<a rel=external href='path'>Path</a>
```

...will trigger a browser navigation when the link is clicked.

### sveltekit:noscroll

When navigating to internal links, SvelteKit will change the scroll position to 0,0 so that the user is at the very top left of the page. When a hash is defined, it will scroll to the element with a matching ID.

In certain cases, you may wish to disable this behaviour. Adding a `sveltekit:noscroll` attribute to a link...

```html
<a href='path' sveltekit:noscroll>Path</a>
```

...will prevent scrolling after the link is clicked.
