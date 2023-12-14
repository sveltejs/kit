---
title: Shallow routing
---

As you navigate around a SvelteKit app, you create _history entries_. Clicking the back and forward buttons traverses through this list of entries, re-running any `load` functions and replacing page components as necessary.

Sometimes, it's useful to create history entries _without_ navigating. For example, you might want to show a modal dialog that the user can dismiss by navigating back. This is particularly valuable on mobile devices, where swipe gestures are often more natural than interacting directly with the UI. In these cases, a modal that is _not_ associated with a history entry can be a source of frustration, as a user may swipe backwards in an attempt to dismiss it and find themselves on the wrong page.

SvelteKit makes this possible with the [`pushState`](/docs/modules#$app-navigation-pushstate) and [`replaceState`](/docs/modules#$app-navigation-replacestate) functions, which allow you to associate state with a history entry without navigating. For example, to implement a history-driven modal:

```svelte
<!--- file: +page.svelte --->
<script>
	import { pushState } from '$app/navigation';
	import { page } from '$app/stores';
	import Modal from './Modal.svelte';

	function showModal() {
		pushState('', {
			showModal: true
		});
	}
</script>

{#if $page.state.showModal}
	<Modal close={() => history.back()} />
{/if}
```

The modal can be dismissed by navigating back (unsetting `$page.state.showModal`) or by interacting with it in a way that causes the `close` callback to run, which will navigate back programmatically.

## API

The first argument to `pushState` is the URL, relative to the current URL. To stay on the current URL, use `''`.

The second argument is the new page state, which can be accessed via the [page store](/docs/modules#$app-stores-page) as `$page.state`. You can make page state type-safe by declaring an [`App.PageState`](/docs/types#app) interface (usually in `src/app.d.ts`).

To set page state without creating a new history entry, use `replaceState` instead of `pushState`.

## Loading data from a route

When doing a shallow navigation you might want to show a reduced version of a page in a modal, for which you need the data of that page. You can retrieve it by calling `preloadData` with the desired page URL and use its result to populate the component. This will call the load function(s) associated with that route and give you back the result.

```svelte
<!--- file: Model.svelte --->
<script>
	import { preloadData, goto } from '$app/navigation';

	export let close;

	const data = preloadData('/path/to/page/this/modal/represents').then(result => {
		if (result.type === 'loaded' && result.status === 200) {
			return result.data;
		} else {
			// Something went wrong, navigate to page directly
			goto('/path/to/page/this/modal/represents');
		}
	});
</script>

<dialog open>
	{#await data}
		<!-- add your loading UI here -->
	{:then }
		<h1>{data.title}</h1>
		<p>{data.content}</p>
	{/await}
	<button on:click={close}>Close</button>
</dialog>
```

## Caveats

During server-side rendering, `$page.state` is always an empty object. The same is true for the first page the user lands on — if the user reloads the page, state will _not_ be applied until they navigate.

Shallow routing is a feature that requires JavaScript to work. Be mindful when using it and try to think of sensible fallback behavior in case JavaScript isn't available.
