---
title: Snapshots
---

Ephemeral DOM state — like scroll positions on sidebars, the content of `<input>` elements and so on — is discarded when you navigate from one page to another.

For example, if the user fills out a form but navigates away and then back before submitting, or if the user refreshes the page, the values they filled in will be lost. In cases where it's valuable to preserve that input, you can take a _snapshot_ of DOM state, which can then be restored if the user navigates back.

To do this, call `snapshot` from `$app/navigation` during component initialization:

```svelte
<!--- file: +page.svelte --->
<script>
	import { snapshot } from '$app/navigation';

	let comment = $state('');

	snapshot({
		capture: () => comment,
		restore: (value) => (comment = value)
	});
</script>

<form method="POST">
	<label for="comment">Comment</label>
	<textarea id="comment" bind:value={comment} />
	<button>Post comment</button>
</form>
```

When you navigate away from this page — including via [shallow routing](shallow-routing) — the `capture` function is called immediately before the page updates, and the returned value is associated with the current entry in the browser's history stack. If you navigate back, the `restore` function is called with the stored value as soon as the page is updated.

By default, the snapshot `id` is generated from the call site. Pass an explicit `id` to keep snapshots stable across deployments or distinguish multiple uses of a shared helper.

The optional `reset` callback runs on navigations where there is no captured value to restore, such as when a new history entry is created.

Captured values are serialized with [devalue](https://github.com/sveltejs/devalue), which handles JSON as well as types like `Date` and `Map`, and values handled by your [`transport`](hooks#Universal-hooks-transport) hook. The serialized data is persisted to `sessionStorage`, which allows the state to be restored when the page is reloaded, or when the user navigates back from a different site.

> [!NOTE] Avoid returning very large objects from `capture` — once captured, objects will be retained in memory for the duration of the session, and in extreme cases may be too large to persist to `sessionStorage`.

## export const snapshot

> [!LEGACY]
> Previously, snapshots were created by exporting a `snapshot` object with `capture` and `restore` methods from a `+page.svelte` or `+layout.svelte`. This form is deprecated in favour of the `snapshot` helper, which can be called from any component.

```svelte
<!--- file: +page.svelte --->
<script>
	let comment = $state('');

	/** @type {import('./$types').Snapshot<string>} */
	export const snapshot = {
		capture: () => comment,
		restore: (value) => comment = value
	};
</script>
```

Values captured this way are serialized as JSON, and shallow navigations do not capture them.
