---
title: State management
---

Managing state is one of the hardest parts in application development. This section covers various use cases with regards to state management and what to watch out for.

## Avoid global state in SSR

If you are creating a [single page application (SPA)](glossary#spa) with SvelteKit, you can create global state freely, as you can be sure that it's only initialized inside the user's browser. If you use [SSR](glossary#ssr) however, you have to watch out for a couple of things when managing state. In many server environments, a single instance of your app will serve multiple users (this is not specific to SvelteKit - it's one of the gotchas of working with such environments). For that reason, per-request or per-user state must not be stored in global variables.

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

- if you need to access the state only inside server `load` functions, use [`locals`](hooks#server-hooks-handle)
- if you need to persist the state across reloads, but only need to access it inside `load` functions, use [`cookies` in server `load` functions](load#cookies-and-headers). If the state is more complex, safe a key to the state in the cookie to look it up in for example a database
- if you need to access and update the state inside components, use Svelte's [context feature](https://svelte.dev/docs#run-time-svelte-setcontext). That way, the state is scoped to components, which means they are not shared across different requests on the server. The drawback is that you can only access the context at component initialization, which may make interacting with the store value a little trickier if you want to do that outside of components. SvelteKit's stores from `$app/stores` for example are setup like this (which is why you may have encountered a related error message)

```svelte
/// +layout.svelte
<script>
	import { setContext } from 'svelte';

	/** @type {import('./$types').LayoutData} */
	export let data;

	// Create a store...
	const user = writable(data.user);
	// ...add it to the context for child components to access
	setContext('user', user);
	// Optionally update the data everytime the load function is rerun
	$: $user = data.user;
</script>
```

```svelte
/// +src/user/+page.svelte
<script>
	import { getContext } from 'svelte';

	// Retrieve user store from context
	const user = getContext('user');
</script>

<p>Welcome {$user.name}</p>
```

If you have global data whose initial state is not dependent on a request (in other words, it's always the same), then you can keep storing that data globally, as long as you make sure you don't update it during the initial rendering on the server (during load or component render).

## Managing forms

When coming from a pure Svelte or JavaScript background, you might be used to handling all form interactions through JavaScript. This works well when JavaScript is available but results in unresponsive UI when it isn't (which may be [more often than you think](https://kryogenix.org/code/browser/everyonehasjs.html)). If this is a concern to you, leverage SvelteKit's [form actions](form-actions) instead.

## Leverage the URL as state

UI-only state like "is the accordion open" are ok to store as component-level state that does not survive page reloads. Other state such as selected filters on a shopping page are better stored inside the URL as query parameters. That way they survive reloads and are accessible inside `load` functions through the `url` property. 
