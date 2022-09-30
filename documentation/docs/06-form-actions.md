---
title: Form Actions
---

A `+page.server.js` file can export _actions_, which allow you to `POST` data to the server using the `<form>` element.

When using `<form>`, client-side JavaScript is optional, but you can easily _progressively enhance_ your form interactions with JavaScript to provide the best user experience.

### Default actions

In the simplest case, a page declares a `default` action:

```js
/// file: src/routes/login/+page.server.js
/** @type {import('./$types').Actions} */
export const actions = {
	default: async (event) => {
		// TODO log the user in
	}
};
```

To invoke this action from the `/login` page, just add a `<form>` — no JavaScript needed:

```svelte
/// file: src/routes/login/+page.svelte
<form method="POST">
	<input name="email" type="email">
	<input name="password" type="password">
	<button>Log in</button>
</form>
```

If someone were to click the button, the browser would send the form data via `POST` request to the server, running the default action.

> Actions always use `POST` requests, since `GET` requests should never have side-effects.

We can also invoke the action from other pages (for example if there's a login widget in the nav in the root layout) by adding the `action` attribute, pointing to the page:

```html
/// file: src/routes/+layout.svelte
<form method="POST" action="/login">
	<!-- content -->
</form>
```

### Named actions

Instead of one `default` action, a page can have as many named actions as it needs:

```diff
/// file: src/routes/login/+page.server.js

/** @type {import('./$types').Actions} */
export const actions = {
-	default: async (event) => {
+	login: async (event) => {
		// TODO log the user in
	},
+	register: async (event) => {
+		// TODO register the user
+	}
};
```

To invoke a named action, add a query parameter with the name prefixed by a `/` character:

```svelte
/// file: src/routes/login/+page.svelte
<form method="POST" action="?/register">
```

```svelte
/// file: src/routes/+layout.svelte
<form method="POST" action="/login?/register">
```

As well as the `action` attribute, we can use the `formaction` attribute on a button to `POST` the same form data to a different action than the parent `<form>`:

```diff
/// file: src/routes/login/+page.svelte
-<form method="POST">
+<form method="POST" action="?/login">
	<input name="email" type="email">
	<input name="password" type="password">
	<button>Log in</button>
+	<button formaction="?/register">Register</button>
</form>
```

> We can't have default actions next to named actions, because if you POST to a named action without a redirect, the query parameter is persisted in the URL, which means the next default POST would go through the named action from before.

### Anatomy of an action

Each action receives a `RequestEvent` object, allowing you to read the data with `request.formData()`. After processing the request (for example, logging the user in by setting a cookie), the action can respond with data that will be available through the `form` property on the corresponding page and through `$page.form` app-wide until the next update.

```js
// @errors: 2339 2304
/// file: src/routes/login/+page.server.js
/** @type {import('./$types').Actions} */
export const actions = {
	login: async ({ cookies, request }) => {
		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

		const user = await db.getUser(email);
		cookies.set('sessionid', await db.createSession(user));

		return { success: true };
	},
	register: async (event) => {
		// TODO register the user
	}
};
```

```svelte
/// file: src/routes/login/+page.svelte
<script>
	/** @type {import('./$types').PageData} */
	export let data;

	/** @type {import('./$types').ActionData} */
	export let form;
</script>

{#if form?.success}
	<!-- this message is ephemeral; it exists because the page was rendered in
	       response to a form submission. it will vanish if the user reloads -->
	<p>Successfully logged in! Welcome back, {data.user.name}</p>
{/if}
```

#### Validation errors

If the request couldn't be processed because of invalid data, you can return validation errors — along with the previously submitted form values — back to the user so that they can try again. The `invalid` function lets you return an HTTP status code (typically 400, in the case of validation errors) along with the data:

```diff
// @errors: 2339 2304
/// file: src/routes/login/+page.server.js
+import { invalid } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	login: async ({ cookies, request }) => {
		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

+		if (!email) {
+			return invalid(400, { email, missing: true });
+		}

		const user = await db.getUser(email);

+		if (!user || user.password !== hash(password)) {
+			return invalid(400, { email, incorrect: true });
+		}

		cookies.set('sessionid', await db.createSession(user));

		return { success: true };
	},
	register: async (event) => {
		// TODO register the user
	}
};
```

> Note that as a precaution, we only return the email back to the page — not the password.

```diff
/// file: src/routes/login/+page.svelte
<form method="POST" action="?/login">
-	<input name="email" type="email">
+	{#if form?.missing}<p class="error">The email field is required</p>{/if}
+	{#if form?.incorrect}<p class="error">Invalid credentials!</p>{/if}
+	<input name="email" type="email" value={form?.email ?? ''}>

	<input name="password" type="password">
	<button>Log in</button>
	<button formaction="?/register">Register</button>
</form>
```

The returned data must be serializable as JSON. Beyond that, the structure is entirely up to you. For example, if you had multiple forms on the page, you could distinguish which `<form>` the returned `form` data referred to with an `id` property or similar.

#### Redirects

Redirects (and errors) work exactly the same as in [`load`](/docs/load#redirects):

```diff
// @errors: 2339 2304
/// file: src/routes/login/+page.server.js
+import { invalid, redirect } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
+	login: async ({ cookies, request, url }) => {
		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

		const user = await db.getUser(email);
		if (!user) {
			return invalid(400, { email, missing: true });
		}

		if (user.password !== hash(password)) {
			return invalid(400, { email, incorrect: true });
		}

		cookies.set('sessionid', await db.createSession(user));

+		if (url.searchParams.has('redirectTo')) {
+			throw redirect(303, url.searchParams.get('redirectTo'));
+		}

		return { success: true };
	},
	register: async (event) => {
		// TODO register the user
	}
};
```

### Progressive enhancement

In the preceding sections we built a `/login` action that [works without client-side JavaScript](https://kryogenix.org/code/browser/everyonehasjs.html) — not a `fetch` in sight. That's great, but when JavaScript _is_ available we can progressively enhance our form interactions to provide a better user experience.

#### use:enhance

The easiest way to progressively enhance a form is to add the `use:enhance` action:

```diff
/// file: src/routes/login/+page.svelte
<script>
+	import { enhance } from '$app/forms';

	/** @type {import('./$types').ActionData} */
	export let form;
</script>

+<form method="POST" use:enhance>
```

> Yes, it's a little confusing that the `enhance` action and `<form action>` are both called 'action'. These docs are action-packed. Sorry.

Without an argument, `use:enhance` will emulate the browser-native behaviour, just without the full-page reloads. It will:

- update the `form` property, `$page.form` and `$page.status` on a successful or invalid response, but only if the action is on the same page you're submitting from. So for example if your form looks like `<form action="/somewhere/else" ..>`, `form` and `$page` will _not_ be updated. This is because in the native form submission case you would be redirected to the page the action is on.
- invalidate all data using `invalidateAll` on a successful response
- call `goto` on a redirect response
- render the nearest `+error` boundary if an error occurs

To customise the behaviour, you can provide a function that runs immediately before the form is submitted, and (optionally) returns a callback that runs with the `ActionResult`. Note that if you return a callback, the default behavior mentioned above is not triggered. To get it back, call `update`.

```svelte
<form
	method="POST"
	use:enhance={({ form, data, action, cancel }) => {
		// `form` is the `<form>` element
		// `data` is its `FormData` object
		// `action` is the URL to which the form is posted
		// `cancel()` will prevent the submission

		return async ({ result, update }) => {
			// `result` is an `ActionResult` object
			// `update` is a function which triggers the logic that would be triggered if this callback wasn't set
		};
	}}
>
```

You can use these functions to show and hide loading UI, and so on.

#### applyAction

If you provide your own callbacks, you may need to reproduce part of the default `use:enhance` behaviour, such as showing the nearest `+error` boundary. Most of the time, calling `update` passed to the callback is enough. If you need more customization you can do so with `applyAction`:

```diff
<script>
+	import { enhance, applyAction } from '$app/forms';

	/** @type {import('./$types').ActionData} */
	export let form;
</script>

<form
	method="POST"
	use:enhance={({ form, data, action, cancel }) => {
		// `form` is the `<form>` element
		// `data` is its `FormData` object
		// `action` is the URL to which the form is posted
		// `cancel()` will prevent the submission

		return async ({ result }) => {
			// `result` is an `ActionResult` object
+			if (result.type === 'error') {
+				await applyAction(result);
+			}
		};
	}}
>
```

The behaviour of `applyAction(result)` depends on `result.type`:

- `success`, `invalid` — sets `$page.status` to `result.status` and updates `form` and `$page.form` to `result.data` (regardless of where you are submitting from, in contrast to `update` from `enhance`)
- `redirect` — calls `goto(result.location)`
- `error` — renders the nearest `+error` boundary with `result.error`

#### Custom event listener

We can also implement progressive enhancement ourselves, without `use:enhance`, with a normal event listener on the `<form>`:

```svelte
/// file: src/routes/login/+page.svelte
<script>
	import { invalidateAll, goto } from '$app/navigation';
	import { applyAction } from '$app/forms';

	/** @type {import('./$types').ActionData} */
	export let form;

	/** @type {any} */
	let error;

	async function handleSubmit(event) {
		const data = new FormData(this);

		const response = await fetch(this.action, {
			method: 'POST',
			body: data
		});

		/** @type {import('@sveltejs/kit').ActionResult} */
		const result = await response.json();

		if (result.type === 'success') {
			// re-run all `load` functions, following the successful update
			await invalidateAll();
		}

		applyAction(result);
	}
</script>

<form method="POST" on:submit|preventDefault={handleSubmit}>
	<!-- content -->
</form>
```

If you have a `+server.js` alongside your `+page.server.js`, `fetch` requests will be routed there by default. To `POST` to an action in `+page.server.js` instead, use the custom `x-sveltekit-action` header:

```diff
const response = await fetch(this.action, {
	method: 'POST',
	body: data,
+	headers: {
+		'x-sveltekit-action': 'true'
+	}
});
```

### Alternatives

Form actions are the preferred way to send data to the server, since they can be progressively enhanced, but you can also use [`+server.js`](/docs/routing#server) files to expose (for example) a JSON API.