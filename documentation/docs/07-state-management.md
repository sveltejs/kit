---
title: Stores
---

The `page` and `session` values passed to `preload` functions are available to components as [stores](https://svelte.dev/tutorial/writable-stores), along with `navigating`.

A component can retrieve the stores by importing them:

```html
<script>
	import { navigating, page, session } from '$app/stores';
</script>
```

- `navigating` contains a read-only boolean value, indicating whether or not a navigation is pending
- `page` contains read-only information about the current route. See [preloading](docs#Arguments) for details.
- `session` can be used to pass data from the server related to the current request. It is a [writable store](https://svelte.dev/tutorial/writable-stores), meaning you can update it with new data. If, for example, you populate the session with the current user on the server, you can update the store when the user logs in. Your components will refresh to reflect the new state

### Seeding session data

`session` is `undefined` by default. To populate it with data, implement a function that returns session data given an HTTP request. This function will be located in `src/setup/index.js` (or `src/setup/index.ts`).

As an example, let's look at how to populate the session with the current user.

```js
// src/setup/index.js
import cookie from 'cookie';
import jwt from 'jsonwebtoken';

export async function prepare(headers) {
	const { token } = cookie.parse(headers.cookie);
	const user = token ? jwt.decode(token) : false;

	return {
		context: {
			authenticated: !!user,
			user
		}
	};
}

export async function getSession(context) {
	return context;
}
```

The `prepare` function receives request headers from the current request. You can optionally return response headers and a context object passed to server routes (for example, `src/routes/api.js`).

The `getSession` function may return a `Promise` (or, equivalently, be `async`). It receives the `context` from the `prepare` function, and you can seed the `session` data by returning it.

The context and session data must be serializable. This means it must not contain functions or custom classes, just built-in JavaScript data types.

> Note that if `session` returns a `Promise` (or is `async`), it will be re-awaited for on **every** server-rendered page route.
