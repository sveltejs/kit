## enhance_file_without_enctype

> Your form contains <input type="file"> fields, but is missing the necessary `enctype="multipart/form-data"` attribute

Without `enctype="multipart/form-data"`, a browser submitting the form natively only sends the names of the selected files, not their contents. An enhanced form would behave differently, so [`use:enhance`](https://svelte.dev/docs/kit/form-actions#Progressive-enhancement-use:enhance) rejects the submission rather than letting the two drift apart (see [#9819](https://github.com/sveltejs/kit/issues/9819)). Add the attribute to the `<form>`:

```svelte
<form method="POST" enctype="multipart/form-data" use:enhance>
	<input type="file" name="avatar" />
</form>
```

## enhance_invalid_method

> use:enhance can only be used on <form> fields with method="POST"

[`use:enhance`](https://svelte.dev/docs/kit/form-actions#Progressive-enhancement-use:enhance) progressively enhances forms that submit to [form actions](https://svelte.dev/docs/kit/form-actions), which only handle `POST` requests. Add `method="POST"` to the form. A `GET` form doesn't need enhancing: SvelteKit's router already handles its submissions client-side, like a link.
