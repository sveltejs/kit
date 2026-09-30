## app_body_unwrapped

> Placing %tag% directly inside <body> is not recommended, as your app may break for users who have certain browser extensions installed

Browser extensions often inject elements into `<body>`. When your app is rendered directly into `<body>`, hydration can remove those elements or be confused by them, which breaks the extension or your app. Wrap the placeholder in an element in your [app template](https://svelte.dev/docs/kit/project-structure#Project-files-src):

```html
<body>
	<div style="display: contents">%sveltekit.body%</div>
</body>
```

## full_reload_after_error

> An error occurred while loading the page. This will cause a full page reload

When a client-side navigation fails in a way SvelteKit can't render an error page for (for example, loading the route's code failed), it falls back to a full-page navigation so that the server can respond instead. This warning only appears during development, and execution pauses at a `debugger` statement if your devtools are open so that you can inspect the error before the page reloads. Check the console and network tab for the underlying failure.

## goto_invalidate_all_deprecated

> The `goto(..., { invalidateAll: %value% })` option has been deprecated in favour of `refreshAll`

The `invalidateAll` option of [`goto`](https://svelte.dev/docs/kit/$app-navigation#goto) has been renamed to `refreshAll`, which also refreshes active remote functions. Replace `invalidateAll` with `refreshAll`.

## goto_replace_state_deprecated

> The `goto(..., { replaceState: %value% })` option has been deprecated in favour of `replace`

The `replaceState` option of [`goto`](https://svelte.dev/docs/kit/$app-navigation#goto) has been renamed to `replace`. Replace `replaceState` with `replace`.

## history_api_conflict

> Avoid using `history.pushState(...)` and `history.replaceState(...)` as these will conflict with SvelteKit's router. Use `goto(...)` from `$app/navigation` instead.

SvelteKit's router stores its own state in each history entry, which it uses to restore scroll positions, snapshots and [`page.state`](https://svelte.dev/docs/kit/$app-state#page) when navigating back and forward. Calling the browser's history methods directly creates entries without that state. Use [`goto`](https://svelte.dev/docs/kit/$app-navigation#goto) to navigate, or `goto(url, { state, shallow: true })` for [shallow routing](https://svelte.dev/docs/kit/shallow-routing).

## hmr_reload_after_error

> The next HMR update will cause the page to reload

An unexpected error was handled during development. Because the app may be in an inconsistent state after such an error, SvelteKit reloads the page on the next hot module replacement update rather than patching it in place.

## push_state_deprecated

> `pushState(...)` is deprecated. Use `goto(url, { state, shallow: true })` instead.

[Shallow routing](https://svelte.dev/docs/kit/shallow-routing) is now done with [`goto`](https://svelte.dev/docs/kit/$app-navigation#goto), which accepts the same `state`:

```js
import { goto } from '$app/navigation';

// instead of pushState('/photos/1', { selected: 1 })
await goto('/photos/1', { state: { selected: 1 }, shallow: true });
```

## replace_state_deprecated

> `replaceState(...)` is deprecated. Use `goto(url, { state, shallow: true, replace: true })` instead.

[Shallow routing](https://svelte.dev/docs/kit/shallow-routing) is now done with [`goto`](https://svelte.dev/docs/kit/$app-navigation#goto), which accepts the same `state`:

```js
import { goto } from '$app/navigation';

// instead of replaceState('/photos/1', { selected: 1 })
await goto('/photos/1', { state: { selected: 1 }, shallow: true, replace: true });
```

## snapshot_export_deprecated

> `export const snapshot` is deprecated. Use the `snapshot` helper from `$app/navigation` instead.

Rather than exporting a `snapshot` object from a page or layout, call the [`snapshot`](https://svelte.dev/docs/kit/snapshots) function from `$app/navigation` during component initialization. It works in any component, not just pages and layouts:

```svelte
<script>
	import { snapshot } from '$app/navigation';

	let comment = $state('');

	snapshot({
		capture: () => comment,
		restore: (value) => (comment = value)
	});
</script>
```
