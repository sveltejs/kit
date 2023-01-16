---
title: State Management
---

Managing state is one of the hardest parts in application development. In this section, we will go over the different types of state, how SvelteKit can help you with managing it, and different patterns for various use cases.

## Types of state

Apps have a multitude of different states. State can broadly be classified by two adjacent categories: The semantic category of the state, and how it is represented.

Semantic categories of state are:
- Local state: State that is only relevant inside one component, and managed inside it.
- Global state: State that is relevant to many or all parts of the application, and is likely modified from different places.

How state can be represented:
- JavaScript variable: Not visible from the outside
- URL: What page you're on, but also information for the page itself through query parameters for example
- Cookies: Mostly modifiable through the server, contains for example information about the current user. Can be used to persist state across browser tabs or reloads.
- localStorage/sessionStorage: Persist state across tabs or reloads, for example user settings.
- API/Backend: Data that is saved inside a database, for example the list of TODOs the user entered.

The above are not exhaustive lists, and different measures could be used to categorize state. The key point is to think about state systematically before adding it to your application.

## Careful with global state

If you are creating an [SPA](/docs/glossary#csr-and-spa) with SvelteKit, you can create global state freely, as you can be sure that it's only initialized inside the user's browser. If you use [SSR](/docs/glossary#ssr) however, you have to watch out for a couple of things when managing state. In many server environments, a single instance of your app will serve multiple users (this is not specific to SvelteKit - it's one of the gotchas of working with such environments). For that reason, per-request or per-user state must not be stored in global variables.

Consider the following example where the user is set from inside a `load` function:

```js
/// file: +page.js
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
