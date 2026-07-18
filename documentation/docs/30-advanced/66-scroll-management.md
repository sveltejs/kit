---
title: Scroll management
---

When you navigate between pages, SvelteKit mirrors the browser's default behaviour: it scrolls to the top of the page (or to the element with a matching ID, if the link includes a `#hash`), and restores the previous scroll position when you navigate back or forward. You can opt out per link with [`data-sveltekit-noscroll`](link-options#data-sveltekit-noscroll) or per navigation with the `noScroll` option of [`goto`]($app-navigation#goto).

This applies to the scroll position of the _document_. If your pages scroll inside a custom container instead — for example a layout where `<html>` and `<body>` have `overflow: hidden` and an inner element scrolls, as is common in mobile-style app shells — SvelteKit has no way of knowing which element it should scroll. The container will keep its scroll position when you navigate, and nothing will be restored when you go back.

Since only your app knows which element scrolls, you can manage the container yourself with [`afterNavigate`]($app-navigation#afterNavigate) and a [snapshot](snapshots) in the layout that owns it:

```svelte
<!--- file: src/routes/+layout.svelte --->
<script>
	import { afterNavigate } from '$app/navigation';

	let { children } = $props();

	/** @type {HTMLElement} */
	let container;

	/** @type {import('./$types').Snapshot<number>} */
	export const snapshot = {
		capture: () => container.scrollTop,
		restore: (top) => (container.scrollTop = top)
	};

	afterNavigate((navigation) => {
		if (navigation.type !== 'popstate') {
			container.scrollTo({ top: 0, left: 0, behavior: 'instant' });
		}
	});
</script>

<div class="scroller" bind:this={container}>
	{@render children()}
</div>
```

On every navigation, `capture` saves the container's scroll position against the outgoing history entry immediately before the page updates, and `afterNavigate` scrolls new pages to the top. On back and forward navigations, `restore` is called with the saved position after the `afterNavigate` callbacks have run, so the two don't conflict. Snapshots are persisted to `sessionStorage`, so the position also survives a reload. Links with a `#hash` still end up at the targeted element.

Note that `afterNavigate` callbacks can't tell whether a navigation used [`data-sveltekit-noscroll`](link-options#data-sveltekit-noscroll) or `goto`'s `noScroll` option, so the container is also reset on those navigations.

> [!NOTE] Passing [`behavior: 'instant'`](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTo) makes the reset immediate even if the container has [`scroll-behavior: smooth`](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-behavior) in CSS, which would otherwise animate it on every navigation.
