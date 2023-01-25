---
title: State Management
---

Managing state is one of the hardest parts in application development. This section covers various use cases with regards to state management and what to watch out for.

## Careful with global state

If you are creating an [SPA](/docs/glossary#csr) with SvelteKit, you can create global state freely, as you can be sure that it's only initialized inside the user's browser. If you use [SSR](/docs/glossary#ssr) however, you have to watch out for a couple of things when managing state. In many server environments, a single instance of your app will serve multiple users (this is not specific to SvelteKit - it's one of the gotchas of working with such environments). For that reason, per-request or per-user state must not be stored in global variables.

Consider the following example where the user is set from inside a `load` function:

```js 
/// file: +page.js
// @filename: ambient.d.ts
declare module '$lib/user' {
	export const user: { set: (value: any) => void };
}

// @filename: index.js
// ---cut---
// DON'T DO THIS!
import { user } from '$lib/user';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const response = await fetch('/api/user');
	user.set(await response.json());
}
```

If you are using SSR, the `load` function will run on the server initially, which means that the whole server instance which serves _all_ requests from _all_ users has its `user` state set to the one just requested from the API. To scope this to a single user, you have a couple of options:

- if you need to access the user state only inside `load` functions, use `locals` in server `load` functions
- if you need to persist the user state across reloads, but only need to access it inside `load` functions, use `cookies` in server `load` functions
- if you need to access and update the state inside components, use Svelte's [context feature](https://svelte.dev/docs#run-time-svelte-setcontext). That way, the state is scoped to components, which means they are not shared across different requests on the server. The drawback is that you can only set and subscribe to the store at component initialization. SvelteKit's stores from `$app/stores` for example are setup like this (which is why you may have encountered a related error message)

If you have global data whose initial state is not dependent on a request (in other words, it's always the same), then you can keep storing that data globally, as long as you make sure you don't update it during the initial rendering on the server (during load or component render).

## Managing forms

If you are coming from regular Svelte, you may be used to doing something like this when creating a form to react to user input:

```svelte
/// file: send-message/+page.svelte
<script>
	let message;

	function send() {
		fetch('/api/message', {
			method: 'POST',
			body: JSON.stringify({ message })
		});
		message = '';
	}
</script>

<form on:submit|preventDefault={send}>
	<input bind:value={message} />
</form>
```

```js
/// file: api/message/+server.js

/** @type {import('./$types').RequestHandler} */
export function POST() {
	// store data somewhere
}
```

This works well when JavaScript is available but results in unresponsive UI when it isn't (which may be [more often than you think](https://kryogenix.org/code/browser/everyonehasjs.html)). If this is a concern to you, leverage SvelteKit's [form actions](/docs/form-actions) instead. Apart from being able to build more resilient apps, this may also improve your code base because you for example can colocate the backend logic of posting the message next to the page triggering it. The same code using form actions would look roughly like this:

```svelte
/// file: send-message/+page.svelte
<script>
	import { enhance } from '$app/forms';
</script>

<form method="post" use:enhance>
	<input name="message" />
</form>
```

```js
/// file: send-message/+page.server.js

/** @type {import('./$types').Actions} */
export const actions = {
	default: (request) => {
		// store data somewhere
	}
}
```
