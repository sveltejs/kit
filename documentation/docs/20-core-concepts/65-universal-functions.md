---
title: Universal functions
---

Universal functions are the counterpart to [remote functions](remote-functions). They have the same API — `query`, `form` and `command` — but rather than always running on the server, they run _wherever they are called_: on the server during server-side rendering, and in the browser after the page has hydrated. This makes them a good fit for fetching data from an external API, or from a [`+server.js`](routing#server) endpoint.

```js
/// file: src/routes/todos/data.js
import { query } from '$app/universal';

export const getTodos = query(async () => {
	const response = await fetch('/api/todos');
	return response.json();
});
```

```svelte
<!--- file: src/routes/todos/+page.svelte --->
<script>
	import { getTodos } from './data';
</script>

<ul>
	{#each await getTodos() as todo}
		<li>{todo.text}</li>
	{/each}
</ul>
```

As with remote functions, using `await` in your components requires the `compilerOptions.experimental.async` option. Universal functions are exported from `$app/universal` and can be defined in any module, not just `.remote.js` files.

> [!NOTE] This feature is experimental and subject to change without notice.

## query

The `query` function wraps a function that reads data. Calling it returns a query object that works just like a [remote query](remote-functions#query) — you can `await` it, or use its `current`, `loading` and `error` properties, and update it with `refresh()` and `set(...)`.

When a page is server-rendered, the query runs on the server and its result is serialized into the page alongside the HTML. During hydration, SvelteKit reuses this result rather than running the query again. On subsequent client-side navigations, the query runs in the browser.

You can use `fetch` with relative URLs inside a universal function. On the server it behaves like the [`fetch`](load#Making-fetch-requests) passed to `load` functions — it calls internal endpoints directly and forwards the user's cookies.

### Query arguments

Queries can accept an argument. Since universal functions never get called across a network boundary — the code that calls them runs in the same environment as the function itself — there's no need to validate it with a schema:

```ts
/// file: src/routes/todos/data.js
import { error } from '@sveltejs/kit';
import { query } from '$app/universal';

export const getTodo = query(async (id: string) => {
	const response = await fetch(`/api/todos/${id}`);
	if (!response.ok) error(404, 'Not found');

	return response.json();
});
```

The argument is used as a cache key: calling `getTodo('1')` twice results in a single invocation, both on the server (for the duration of a request) and in the browser (for as long as the query is in use). For this reason, the argument and the return value must be serializable with [devalue](https://github.com/sveltejs/devalue), as with remote functions.

> [!NOTE] Only exported universal functions can reuse their server-side result during hydration, since SvelteKit identifies them by their module and export name.

## query.batch

`query.batch` works like [its remote counterpart](remote-functions#query.batch): calls that happen within the same macrotask are grouped together. The callback receives an array of arguments, and returns a function that resolves the individual calls:

```ts
/// file: src/routes/weather/data.js
import { query } from '$app/universal';

export const getWeather = query.batch(async (cityIds: string[]) => {
	const response = await fetch(`/api/weather?ids=${cityIds.join(',')}`);
	const lookup = new Map<string, { temperature: number }>(await response.json());

	return (cityId) => lookup.get(cityId);
});
```

## query.live

`query.live` takes a function returning an `AsyncIterable` — typically an async generator function:

```js
import { query } from '$app/universal';

export const getTime = query.live(async function* () {
	while (true) {
		yield new Date();
		await new Promise((f) => setTimeout(f, 1000));
	}
});
```

During server-side rendering, the first yielded value is used and serialized into the page. In the browser, the iterable is iterated for as long as the query is in use. As with [remote live queries](remote-functions#query.live), live queries expose `connected` and `done` properties and a `reconnect()` method, and can be iterated with `for await`.

## form

The `form` function returns an object that can be spread onto a `<form>` element. Unlike the other universal functions, it accepts a [Standard Schema](https://standardschema.dev/) as its first argument, which is used to validate the submitted data and to type the form's [fields](remote-functions#form-Fields):

```js
/// file: src/routes/todos/data.js
import * as v from 'valibot';
import { invalid } from '@sveltejs/kit';
import { form } from '$app/universal';

export const addTodo = form(
	v.object({ text: v.pipe(v.string(), v.nonEmpty()) }),
	async ({ text }, issue) => {
		const response = await fetch('/api/todos', {
			method: 'POST',
			body: JSON.stringify({ text })
		});

		if (!response.ok) {
			invalid(issue.text('Could not add todo'));
		}

		return { success: true };
	}
);
```

```svelte
<!--- file: src/routes/todos/+page.svelte --->
<script>
	import { addTodo } from './data';
</script>

<form {...addTodo}>
	<input {...addTodo.fields.text.as('text')} />

	{#each addTodo.fields.text.issues() ?? [] as issue}
		<p class="issue">{issue.message}</p>
	{/each}

	<button>add</button>
</form>
```

When JavaScript is available, the submission is handled in the browser: the data is validated against the schema, and if it is valid the callback runs. Without JavaScript, the form is submitted to the server, which runs the same validation and callback and renders the page with the result — just like a remote form, without you having to do anything.

The rest of the API — `fields`, `result`, `pending`, `validate()`, `enhance(...)` and `for(...)` — works the same as for [remote forms](remote-functions#form). By default, a successful submission refreshes all queries and `load` functions on the page. You can take control of this by calling `submit().updates(...)` inside `enhance`, as described [below](#Updating-queries).

## command

The `command` function wraps a function that writes data. Like its [remote counterpart](remote-functions#command), it can be called from anywhere except during rendering:

```ts
/// file: src/routes/todos/data.js
import { command } from '$app/universal';

export const deleteTodo = command(async (id: string) => {
	await fetch(`/api/todos/${id}`, { method: 'DELETE' });
});
```

## Updating queries

Mutations usually affect data that is displayed elsewhere on the page. Unlike `form`, a `command` doesn't refresh anything by default. To refresh specific queries once a command or form submission has completed, pass them to `updates(...)`:

```svelte
<script>
	import { getTodos, deleteTodo } from './data';

	let { todo } = $props();
</script>

<button onclick={() => deleteTodo(todo.id).updates(getTodos())}>delete</button>
```

You can pass a query instance (`getTodos()`), or a query function (`getTodos`) to refresh all its active instances. To update the UI optimistically, pass an override created with `withOverride(...)`. It is applied immediately and released once the mutation has completed and the refreshed data has arrived:

```js
// @filename: ambient.d.ts
declare const todo: { id: string };
declare const getTodos: import('$app/universal').UniversalQueryFunction<void, Array<{ id: string }>>;
declare const deleteTodo: import('$app/universal').UniversalCommand<string, void>;
// @filename: index.js
// ---cut---
await deleteTodo(todo.id).updates(
	getTodos().withOverride((todos) => todos.filter((t) => t.id !== todo.id))
);
```

Since universal functions run in the same environment as the queries they update, there is no equivalent to [single-flight mutations](remote-functions#Single-flight-mutations) or the `requested` function — the queries are simply re-run after the mutation.
