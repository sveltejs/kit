# Form actions

Form actions handle `POST` requests from HTML forms. Define them in a route's
`+page.server.js` file and export an `actions` object:

```js
// src/routes/login/+page.server.js
export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email');

		// Validate the input and perform the server-side operation.
		return { email };
	}
};
```

Submit to the default action with a regular form. JavaScript is optional:

```svelte
<form method="POST">
	<label>Email <input name="email" type="email"></label>
	<button>Sign in</button>
</form>
```

The action's returned data is available as the page's `form` prop. Use the
generated `PageProps` type to type it. Return `fail(status, data)` from
`@sveltejs/kit` when validation fails; the status and data are then available
to the page so it can show errors and preserve submitted values.

To submit without a full page navigation, import `enhance` from `$app/forms`
and add `use:enhance` to the form. This works with `POST` forms targeting
`+page.server.js` actions. Named actions can be selected with a query string,
for example `<form method="POST" action="?/save">` for an action named `save`.

See the [full form actions guide](https://svelte.dev/docs/kit/form-actions)
for redirects, custom enhancement, and action typing details.
