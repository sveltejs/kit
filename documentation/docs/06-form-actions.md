---
title: Form Actions
---

`+page.server.js` can declare _actions_ which are specifically designed for form interactions. It enables things like preserving user input in case of a full page reload with validation errors while making progressive enhancement through JavaScript possible.

## Defining actions by name

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

## Files and strings are separated

Since `actions` are meant to be used with forms, we can make your life easier by awaiting the `FormData` and separating the form fields which contain strings from those who contain files and running the latter through the [`handleFile`](/docs/hooks#handleFile) hook before passing it as `fields` and `files` into the action function.

```js
/// file: src/routes/todos/+page.server.js
/** @type {import('./$types').Actions} */
export const actions = {
	default: ({ fields, files }) => {
		const name = fields.get('name'); // typed as string
		const image = files.get('image'); // typed as the return type of the handleFile hook
		// ...
	}
};
```

## Validation

A core part of form submissions is validation. For this, an action can `return` using the `invalid` helper method exported from `@sveltejs/kit` if there are validation errors. `invalid` expects a `status` as a required argument, and optionally anything else you want to return as a second argument. This could be the form value (make sure to remove any user sensitive information such as passwords) and an `error` object. In case of a native form submit the second argument to `invalid` populates the `$page.form` store and the `form` prop which is available inside your components. You can use this to preserve user input.

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
	default: async ({ fields, setHeaders, url }) => {
		const username = fields.get('username');
		const password = fields.get('password');

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

## Success

If everything is valid, an action can return a JSON object with data, which will be available through the `$page.form` store and the `form` prop. Alternatively it can `throw` a `redirect` to redirect the user to another page.

```js
/// file: src/routes/login/+page.server.js
import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ url }) => {
		// ...

		if (url.searchParams.get('redirectTo')) {
			throw redirect(303, url.searchParams.get('redirectTo'));
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

## Progressive enhancement

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

## `<Form>` component

As you can see, progressive enhancement is doable, but it may become a little cumbersome over time. That's why we will soon provide an opinionated wrapper component which does all the heavy lifting for you. Here's how the same login page would look like using the `<Form>` component:

```svelte
/// file: src/routes/login/+page.svelte
<script>
	import { Form } from '@sveltejs/kit';
	import { goto } from '$app/navigation';

	async function redirect({ location }) {
		goto(location);
	}
</script>

<Form action="?/addTodo" on:success={redirect} let:errors let:values>
	<input type="text" name="username" value={values?.username} />
	{#if errors?.username}
		<span>{errors.username}</span>
	{/if}
	<input type="password" name="password" />
	<button>Login</button>
</Form>
```

## Alternatives

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
