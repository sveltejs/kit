---
title: Errors
---

Errors are an inevitable fact of software development. SvelteKit handles errors differently depending on where they occur, what kind of errors they are, and the nature of the incoming request.

### Error objects

SvelteKit distinguishes between expected and unexpected errors, both of which are represented as simple `{ message: string }` objects by default.

You can add additional properties, like a `code` or a tracking `id`, as shown below.

### Expected errors

An _expected_ error is one created with the [`error`](/docs/modules#sveltejs-kit-error) helper imported from `@sveltejs/kit`:

```js
/// file: src/routes/blog/[slug]/+page.server.js
// @filename: ambient.d.ts
declare module '$lib/server/database' {
	export function getPost(slug: string): Promise<{ title: string, content: string } | undefined>
}

// @filename: index.js
// ---cut---
import { error } from '@sveltejs/kit';
import * as db from '$lib/server/database';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	const post = await db.getPost(params.slug);

	if (!post) {
		throw error(404, {
			message: 'Not found'
		});
	}

	return { post };
}
```

This tells SvelteKit to set the response status code to 404 and render an [`+error.svelte`](/docs/routing#error) component, where `$page.error` is the object provided as the second argument to `error(...)`.

```svelte
/// file: src/routes/+error.svelte
<script>
	import { page } from '$app/stores';
</script>

<h1>{$page.error.message}</h1>
```

You can add extra properties to the error object if needed...

```diff
throw error(404, {
	message: 'Not found',
+	code: 'NOT_FOUND'
});
```

...otherwise, for convenience, you can pass a string as the second argument:

```diff
-throw error(404, { message: 'Not found' });
+throw error(404, 'Not found');
```

### Unexpected errors

An _unexpected_ error is any other exception that occurs while handling a request. Since these can contain sensitive information, unexpected error messages and stack traces are not exposed to users.

By default, unexpected errors are printed to the console (or, in production, your server logs), while the error that is exposed to the user has a generic shape:

```json
{ "message": "Internal Error" }
```

Unexpected errors will go through the [`handleError`](/docs/hooks#shared-hooks-handleerror) hook, where you can add your own error handling — for example, sending errors to a reporting service, or returning a custom error object.

```js
/// file: src/hooks.server.js
// @errors: 2322 2571 18046 2339
// @filename: ambient.d.ts
const Sentry: any;

// @filename: index.js
// ---cut---
/** @type {import('@sveltejs/kit').HandleServerError} */
export function handleError({ error, event }) {
	// example integration with https://sentry.io/
	Sentry.captureException(error, { event });

	return {
		message: 'Whoops!',
		code: error?.code ?? 'UNKNOWN'
	};
}
```

### Responses

If an error occurs inside `handle` or inside a [`+server.js`](/docs/routing#server) request handler, SvelteKit will respond with either a fallback error page or a JSON representation of the error object, depending on the request's `Accept` headers.

You can customise the fallback error page by adding a `src/error.html` file:

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>%sveltekit.error.message%</title>
	</head>
	<body>
		<h1>My custom error page</h1>
		<p>Status: %sveltekit.status%</p>
		<p>Message: %sveltekit.error.message%</p>
	</body>
</html>
```

SvelteKit will replace `%sveltekit.status%` and `%sveltekit.error.message%` with their corresponding values.

If the error instead occurs inside a `load` function while rendering a page, SvelteKit will render the [`+error.svelte`](/docs/routing#error) component nearest to where the error occurred.

The exception is when the error occurs inside the root `+layout.js` or `+layout.server.js`, since the root layout would ordinarily _contain_ the `+error.svelte` component. In this case, SvelteKit uses the fallback error page.

### Type safety

If you're using TypeScript and need to customize the shape of errors, you can do so by declaring an `App.Error` interface in your app (by convention, in `src/app.d.ts`, though it can live anywhere that TypeScript can 'see'):

```ts
/// file: src/app.d.ts
namespace App {
	interface Error {
		code: string;
		id: string;
	}
}
```

This interface always includes a `message: string` property.