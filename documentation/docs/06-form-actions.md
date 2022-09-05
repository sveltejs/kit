---
title: Form Actions
---

`+page.server.js` can declare _actions_ which are specifically designed for form interactions. It enables things like preserving user input in case of a full page reload with validation errors while making progressive enhancement through JavaScript possible.

### Defining actions by name

Actions are defined through `export const actions = {...}`, with each key being the name of the action and the value being the function that is invoked when the form with that action is submitted. A `POST` request made to the page will invoke the corresponding action using a query parameter that start's with a `/` - so for example `POST todos?/addTodo` will invoke the `addTodo` action. The `default` action is called when no such query parameter is given.

```svelte
/// file: src/routes/todos/+page.svelte
<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<form action="?/addTodo" method="post">
	<input type="text" name="text" />
	<button>Add todo</button>
</form>

<ul>
	{#each data.todos as todo}
		<li>
			<form action="?/editTodo" method="post">
				<input type="hidden" name="id" value={todo.id} />
				<input type="text" name="text" value={todo.text} />
				<button>Edit todo</button>
			</form>
		</li>
	{/each}
</ul>
```

```js
/// file: src/routes/todos/+page.server.js
/** @type {import('./$types').Actions} */
export const actions = {
	addTodo: (event) => {
		// ...
	},
	editTodo: (event) => {
		// ...
	}
};
```

### Anatomy of an action

Each action gets the event object you already know from `load`. Part of it is the `request` object from which you get the form data.

```js
/// file: src/routes/login/+page.server.js
import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request }) => {
		const fields = await request.formData();
		// ...
	}
};
```

After that, it's up to you how to proceed with the form data.

#### Success

If everything is valid, an action can return a JSON object with data, which will be available through the `form` prop. Alternatively it can `throw` a `redirect` to redirect the user to another page.

```js
/// file: src/routes/login/+page.server.js
import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ url }) => {
		// ...

		const location = url.searchParams.get('redirectTo');
		if (location) {
			throw redirect(303, location);
		} else {
			return {
				success: true
			};
		}
	}
};
```

```svelte
/// file: src/routes/login/+page.svelte
<script>
	/** @type {import('./$types').FormData} */
	export let form;
</script>

{#if form?.success}
	<span class="success">Login successful</span>
{/if}

<form>
	...
</form>
```

#### Validation

A core part of form submissions is validation. For this, an action can `return` using the `invalid` helper method exported from `@sveltejs/kit` if there are validation errors. `invalid` expects a `status` as a required argument, and optionally anything else you want to return as a second argument. This could be the form value (make sure to remove any user sensitive information such as passwords) and an `error` object. In case of a native form submit the second argument to `invalid` populates the `form` prop which is available inside your components. You can use this to preserve user input.

```js
/// file: src/routes/login/+page.server.js

// @filename: ambient.d.ts
declare global {
	const db: {
		findUser: (name: string) => Promise<{
			id: string;
			username: string;
			password: string;
		}>
	}
}

export {};

// @filename: index.js
// ---cut---
import { invalid } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, setHeaders, url }) => {
		const fields = await request.formData();
		const username = /** @type {string} */ (fields.get('username'));
		const password = /** @type {string} */ (fields.get('password'));

		const user = await db.findUser(username);

		if (!user) {
			return invalid(403, {
				values: { username },
				errors: { username: 'No user with this username' }
			});
		}

		// ...
	}
};
```

```svelte
/// file: src/routes/login/+page.svelte
<script>
	/** @type {import('./$types').FormData} */
	export let form;
</script>

<form action="?/addTodo" method="post">
	<input type="text" name="username" value={form?.values?.username} />
	{#if form?.errors?.username}
		<span>{form?.errors?.username}</span>
	{/if}
	<input type="password" name="password" />
	<button>Login</button>
</form>
```

### Progressive enhancement

So far, all the code examples run native form submissions - that is, when the user pressed the submit button, the page is reloaded. It's good that this use case is supported since JavaScript may not be loaded all the time. When it is though, it might be a better user experience to use the powers JavaScript gives us to provide a better user experience - this is called progressive enhancement.

First we need to ensure that the page is _not_ reloaded on submission. For this, we prevent the default behavior. Afterwards, we run our JavaScript code instead which does the form submission through `fetch` instead. The result always contains a `status` and `type` property, which is either `"success"`, `"invalid"` or `"redirect"`. In case of `"redirect"`, a location is given. In case of `"invalid"` and `"success"`, the data returned from the action function is available through the `data` property.

```svelte
/// file: src/routes/login/+page.svelte
<script>
	import { invalidateAll, goto } from '$app/navigation';

	/** @type {import('./$types').FormData} */
	export let form;

	async function login(event) {
		const data = new FormData(this);
		const response = await fetch(this.action, {
			method: 'POST',
			headers: {
				accept: 'application/json'
			},
			body: data
		});
		const result = await response.json();
		if (result.type === 'success' || result.type === 'redirect') {
			invalidateAll();
		}
		if (result.type === 'redirect') {
			goto(result.location)
		}
		if (result.type === 'success' || result.type === 'invalid') {
			form = { errors, values } };
		}
	}
</script>

<form action="?/addTodo" method="post" on:submit|preventDefault={login}>
	<input type="text" name="username" value={form?.values?.username} />
	{#if form?.errors.username}
		<span>{form.errors.username}</span>
	{/if}
	<input type="password" name="password" />
	<button>Login</button>
</form>
```

#### `use:enhance`

As you can see, progressive enhancement is doable, but it may become a little cumbersome over time. That's why we provide a small `enhance` action which does most of the heavy lifting for you. Here's how the same login page would look like using the `enhance` action:

```svelte
/// file: src/routes/login/+page.svelte
<script>
	import { enhance } from '$app/forms';

	/** @type {import('./$types').FormData} */
	export let form;
</script>

<form action="?/addTodo" use:enhance>
	<input type="text" name="username" value={forms?.values?.username} />
	{#if forms?.errors?.username}
		<span>{forms.errors.username}</span>
	{/if}
	<input type="password" name="password" />
	<button>Login</button>
</form>
```

By default, the `enhance` action will

- update the `form` property and invalidate all data on a successful response
- update the `form` property on a invalid response
- update `$page.status` on a successful or invalid response
- call `goto` on a redirect response
- redirect to the nearest error page on an unexpected error

You can customize this behavior by providing your own callback to `enhance`.

#### applyAction

Under the hood, the `enhance` action uses `applyAction` to update the `form` prop and `$page.status`. It can also handle `applyAction` redirects and throws to the error page in case of an unexpected error. It's a low level API that you can use to build your own opinionated actions.

```svelte
/// file: src/routes/login/+page.svelte
<script>
	import { applyAction } from '$app/forms';

	/** @type {import('./$types').FormData} */
	export let form;

	function update() {
		// If possible, the value should conform to the `FormData` interface defined through `./$types`
		applyAction({ type: 'success', data: { next: 'value' } });
	}
</script>

<button on:click={update}>Update form prop</button>
```

### Multiple forms

In case you have multiple forms on a single page, be aware of the implications this has on `export let form`. Consider the following example: You have a list of todos which you can delete, but there's a validation that the todo needs to be at least 5 minutes old. Relying on `form?.[todo.id]?.invalid` in the following example would give unexpected results - in case of concurrent submissions with multiple validation error, only the last validation message would be shown:

```svelte
<script>
	import { enhance } from '$app/forms';

	/** @type {import('./$types').ActionData} */
	export let data;
</script>

<ul>
	{#each data.todos as todo}
		<li>
			<form method="post" use:enhance>
				<span>{todo.text}</span>
				{#if form?.[todo.id]?.invalid}
					<span>Can't be deleted yet</span>
				{/if}
				<button>Remove</button>
			</form>
		<li>
	{/each}
<ul>
```

In situations like this, use different measures such as setting the invalid information on a different variable:

```svelte
<script>
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';

	/** @type {import('./$types').ActionData} */
	export let data;
	/** @type {Record<string, boolean>} */
	let invalid = {};
</script>

<ul>
	{#each data.todos as todo}
		<li>
			<form method="post" use:enhance={{ submit: () => {
				return (result) => {
					invalid[todo.id] = result.type === 'invalid';
					if (result.type === 'success') {
						invalidateAll();
					}
				}
			}}}>
				<span>{todo.text}</span>
				<!-- use form?.[todo.id]?.invalid for the native form submission, use invalid[todo.id] for progressive enhancement -->
				{#if form?.[todo.id]?.invalid || invalid[todo.id]}
					<span>Can't be deleted yet</span>
				{/if}
				<button>Remove</button>
			</form>
		<li>
	{/each}
<ul>
```

### Alternatives

In case you don't need your forms to work without JavaScript, you want to use HTTP verbs other than `POST`, or you want to send arbitrary JSON instead of being restricted to `FormData`, then you can resort to interacting with your API through `+server.js` endpoints (which will be possible to place next to `+page` files, soon).

```svelte
<script>
	import { invalidateAll, goto } from '$app/navigation';

	let errors = {};

	async function login(event) {
		const data = Object.fromEntries(new FormData(this));
		const response = await fetch('/api/login', {
			method: 'POST',
			headers: {
				accept: 'application/json'
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});
		const json = await response.json(); // destructure response object
		if (response.ok) { // success, redirect
			invalidateAll();
			goto(json.location);
		} else { // validation error, errors variable
			errors = json.errors;
		}
	}
</script>

<form on:submit|preventDefault={login}>
	<input type="text" name="username" />
	{#if errors.username}
		<span>{errors.username}</span>
	{/if}
	<input type="password" name="password" />
	<button>Login</button>
</form>
```
