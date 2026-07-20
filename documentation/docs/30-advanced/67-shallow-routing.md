---
title: Shallow routing
---

As you navigate around a SvelteKit app, you create _history entries_. Clicking the back and forward buttons traverses through this list of entries, re-running any `load` functions and replacing page components as necessary.

Sometimes, it's useful to create history entries _without_ navigating. For example, you might want to show a modal dialog that the user can dismiss by navigating back. This is particularly valuable on mobile devices, where swipe gestures are often more natural than interacting directly with the UI. In these cases, a modal that is _not_ associated with a history entry can be a source of frustration, as a user may swipe backwards in an attempt to dismiss it and find themselves on the wrong page.

SvelteKit makes this possible with the [`goto`]($app-navigation#goto) function, which allows you to associate state with a history entry without navigating. For example, to implement a history-driven modal:

```svelte
<!--- file: +page.svelte --->
<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Modal from './Modal.svelte';

	async function showModal() {
		await goto(null, {
			state: { showModal: true }
		});
	}
</script>

{#if page.state.showModal}
	<Modal close={() => history.back()} />
{/if}
```

The modal can be dismissed by navigating back (unsetting `page.state.showModal`) or by interacting with it in a way that causes the `close` callback to run, which will navigate back programmatically.

## API

To perform a shallow navigation, call `goto` with the `shallow` option:

```js
await goto('/photos/1', {
	shallow: true,
	state: { showModal: true }
});
```

This updates the visible URL and `page.state` without running `load` functions or changing the rendered page. [`beforeNavigate`]($app-navigation#beforeNavigate), [`onNavigate`]($app-navigation#onNavigate) and [`afterNavigate`]($app-navigation#afterNavigate) will run with `navigation.type === 'goto'` and `navigation.shallow === true`.

Once shallow routing is active, `page.shallow` is set with the visible URL, parameters and route id. `page.url`, `page.params` and `page.route` continue to describe the page that was last rendered as a result of an actual navigation. A regular `goto` call without `shallow: true`, or a link click, exits shallow routing.

To create a history entry with new page state without changing the URL, pass `null` instead:

```js
await goto(null, { state: { showModal: true } });
```

This does not call navigation lifecycle functions. If the page is already showing a shallow route, `page.shallow` and the visible URL are preserved. Otherwise, `page.shallow` remains `null`.

In both cases, `state` can be accessed through the [page object]($app-state#page) as `page.state`. You can make page state type-safe by declaring an [`App.PageState`](types#PageState) interface (usually in `src/app.d.ts`).

By default, `goto` creates a new history entry. To replace the current entry, pass `replace: true`.

By default, state set through `goto` is not restored in the browser after a reload. To preserve it across full page reloads, use `goto(..., { state, persistState: true })`.

> [!NOTE]
> `pushState` and `replaceState` are deprecated. Use `goto` with `shallow: true` or a `null` URL instead, and use the `replace` option when replacing the current history entry.

## Loading data for a route

When shallow routing, you may want to render another `+page.svelte` inside the current page. For example, clicking on a photo thumbnail could pop up the detail view without navigating to the photo page.

For this to work, you need to load the data that the `+page.svelte` expects. A convenient way to do this is to use [`preloadData`]($app-navigation#preloadData) inside the `click` handler of an `<a>` element. If the element (or a parent) uses [`data-sveltekit-preload-data`](link-options#data-sveltekit-preload-data), the data will have already been requested, and `preloadData` will reuse that request.

```svelte
<!--- file: src/routes/photos/+page.svelte --->
<script>
	import { preloadData, goto } from '$app/navigation';
	import { page } from '$app/state';
	import Modal from './Modal.svelte';
	import PhotoPage from './[id]/+page.svelte';

	let { data } = $props();
</script>

{#each data.thumbnails as thumbnail}
	<a
		href="/photos/{thumbnail.id}"
		onclick={async (e) => {
			if (innerWidth < 640        // bail if the screen is too small
				|| e.shiftKey             // or the link is opened in a new window
				|| e.metaKey || e.ctrlKey // or a new tab (mac: metaKey, win/linux: ctrlKey)
				// should also consider clicking with a mouse scroll wheel
			) return;

			// prevent navigation
			e.preventDefault();

			const { href } = e.currentTarget;

			// run `load` functions (or rather, get the result of the `load` functions
			// that are already running because of `data-sveltekit-preload-data`)
			const result = await preloadData(href);

			if (result.type === 'loaded' && result.status === 200) {
				goto(href, { shallow: true, state: { selected: result.data } });
			} else {
				// something bad happened! try navigating
				goto(href);
			}
		}}
	>
		<img alt={thumbnail.alt} src={thumbnail.src} />
	</a>
{/each}

{#if page.state.selected}
	<Modal onclose={() => history.back()}>
		<!-- pass page data to the +page.svelte component,
		     just like SvelteKit would on navigation -->
		<PhotoPage data={page.state.selected} />
	</Modal>
{/if}
```

## Caveats

During server-side rendering, `page.state` is always an empty object.

Shallow routing is a feature that requires JavaScript to work. Be mindful when using it and try to think of sensible fallback behavior in case JavaScript isn't available.
