---
title: Scroll management
---

When you navigate, SvelteKit scrolls new pages to the top (or to the element matching the URL's `#hash`) and restores the previous scroll position when you go back, as the browser does for pages loaded without client-side navigation. SvelteKit only manages the scroll position of the document, and browsers don't consistently restore the scroll position of other elements, so let the document scroll wherever possible.

Headers and sidebars that stay in place while the page scrolls can use `position: sticky`. Adding [`scroll-padding-top`](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-padding-top) to the `<html>` element keeps `#hash` targets from ending up underneath a sticky header:

```css
html {
	scroll-padding-top: 4rem;
}

header {
	position: sticky;
	top: 0;
	height: 4rem;
}
```

## Custom scroll containers

If your pages scroll inside a custom container instead (for example a layout where `<html>` and `<body>` have `overflow: hidden` and an inner element scrolls), the container keeps its scroll position across navigations and nothing is restored when you go back. You can manage it yourself with [`afterNavigate`]($app-navigation#afterNavigate) and a [snapshot](snapshots) in the layout that owns it:

```svelte
<!--- file: src/routes/+layout.svelte --->
<script>
	import { afterNavigate, snapshot } from '$app/navigation';

	let { children } = $props();

	/** @type {HTMLElement} */
	let container;

	afterNavigate(({ shallow, to }) => {
		if (shallow || to?.url.hash) return;
		container.scrollTo({ top: 0, behavior: 'instant' });
	});

	snapshot({
		capture: () => container.scrollTop,
		restore: (top) => container.scrollTo({ top, behavior: 'instant' })
	});
</script>

<div class="scroller" bind:this={container}>
	{@render children()}
</div>
```

The container is not reset on [shallow navigations](shallow-routing), which preserve the scroll position by default, or when the URL has a `#hash`, since SvelteKit scrolls the targeted element into view. On back and forward navigations, the snapshot is restored after the `afterNavigate` callbacks have run.

This only works once the app has loaded, and `afterNavigate` callbacks can't tell whether a navigation used [`data-sveltekit-reset="false"`](link-options#data-sveltekit-reset) or `goto`'s `reset: false`, so the container is also reset on those navigations.

> [!NOTE] `behavior: 'instant'` keeps the reset and restore immediate if the container has [`scroll-behavior: smooth`](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-behavior) in its CSS.
