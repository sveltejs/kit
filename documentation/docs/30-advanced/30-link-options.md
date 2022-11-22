---
title: Link options
---

In SvelteKit, `<a>` elements (rather than framework-specific `<Link>` components) are used to navigate between the routes of your app. If the user clicks on a link whose `href` is 'owned' by the app (as opposed to, say, a link to an external site) then SvelteKit will navigate to the new page by importing its code and then calling any `load` functions it needs to fetch data.

You can customise the behaviour of links with `data-sveltekit-*` attributes. These can be applied to the `<a>` itself, or to a parent element.

### data-sveltekit-preload

To get a head start on importing the code and fetching the page's data, use the `data-sveltekit-preload` attribute, which will start loading everything as soon as the user hovers over the link (on a desktop) or touches it (on mobile), rather than waiting for the `click` event to trigger navigation. Typically, this buys us an extra couple of hundred milliseconds, which is the difference between a user interface that feels laggy, and one that feels snappy.

To apply this behaviour across the board, add the attribute to a parent element (or even the `<body>` in your `src/app.html`):

```html
/// file: src/routes/+layout.svelte
<main data-sveltekit-preload>
	<slot />
</main>
```

> You can also programmatically invoke `prefetch` from `$app/navigation`.

### data-sveltekit-reload

Occasionally, we need to tell SvelteKit not to handle a link, but allow the browser to handle it. Adding a `data-sveltekit-reload` attribute to a link...

```html
<a data-sveltekit-reload href="/path">Path</a>
```

...will cause a full-page navigation when the link is clicked.

Links with a `rel="external"` attribute will receive the same treatment. In addition, they will be ignored during [prerendering](/docs/page-options#prerender).

### data-sveltekit-noscroll

When navigating to internal links, SvelteKit mirrors the browser's default navigation behaviour: it will change the scroll position to 0,0 so that the user is at the very top left of the page (unless the link includes a `#hash`, in which case it will scroll to the element with a matching ID).

In certain cases, you may wish to disable this behaviour. Adding a `data-sveltekit-noscroll` attribute to a link...

```html
<a href="path" data-sveltekit-noscroll>Path</a>
```

...will prevent scrolling after the link is clicked.

### Disabling options

To disable any of these options inside an element where they have been enabled, use the `"off"` value:

```html
<div data-sveltekit-preload>
	<!-- these links will be prefetched -->
	<a href="/a">a</a>
	<a href="/b">b</a>
	<a href="/c">c</a>

	<div data-sveltekit-preload="off">
		<!-- these links will NOT be prefetched -->
		<a href="/d">d</a>
		<a href="/e">e</a>
		<a href="/f">f</a>
	</div>
</div>
```

To apply an attribute to an element conditionally, do this:

```html
<div data-sveltekit-reload={shouldReload ? '' : 'off'}>
```

> This works because in HTML, `<element attribute>` is equivalent to `<element attribute="">`
