## enhance_invalidate_all_deprecated

> The `update({ invalidateAll })` option has been deprecated in favour of `update({ refreshAll })`

The `invalidateAll` option of the `update` function passed to a [`use:enhance`](https://svelte.dev/docs/kit/form-actions#Progressive-enhancement-Customising-use:enhance) callback has been renamed to `refreshAll`, which also refreshes active remote functions. Replace `invalidateAll` with `refreshAll`.
