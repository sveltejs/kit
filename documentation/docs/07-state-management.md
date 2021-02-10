---
title: Stores
---

The `page` and `session` values passed to `preload` functions are available to components as [stores](https://svelte.dev/tutorial/writable-stores), along with `preloading`.

A component can retrieve the stores by importing them:

```html
<script>
	import { preloading, page, session } from '$app/stores';
</script>
```

* `preloading` contains a read-only boolean value, indicating whether or not a navigation is pending
* `page` contains read-only information about the current route. See [preloading](docs#Arguments) for details.
* `session` can be used to pass data from the server related to the current request. It is a [writable store](https://svelte.dev/tutorial/writable-stores), meaning you can update it with new data. If, for example, you populate the session with the current user on the server, you can update the store when the user logs in. Your components will refresh to reflect the new state


### Seeding session data

`session` is `undefined` by default. To populate it with data, implement a function that returns session data given an HTTP request.

As an example, let's look at how to populate the session with the current user. First, add the `session` parameter to the Sapper middleware:

```js
	import { session } from '$app/stores';
	import { goto } from '$app/navigation';
	import { post } from '$common/utils.js';

	async function submit(event) {
		const response = await post(`auth/register`, { username, email, password });

		if (response.user) {
			$session.user = response.user;
			goto('/');
		}
	}
```

`req` is an `SvelteKitRequest` and `res` an `SvelteKitResponse`.

The session data must be serializable. This means it must not contain functions or custom classes, just built-in JavaScript data types.

The `session` function may return a `Promise` (or, equivalently, be `async`).

> Note that if `session` returns a `Promise` (or is `async`), it will be re-awaited for on **every** server-rendered page route.
