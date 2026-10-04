---
title: Auth
---

Auth refers to authentication and authorization, which are common needs when building a web application. Authentication means verifying that the user is who they say they are based on their provided credentials. Authorization means determining which actions they are allowed to take.

## Sessions vs tokens

After the user has provided their credentials such as a username and password, we want to allow them to use the application without needing to provide their credentials again for future requests. Users are commonly authenticated on subsequent requests with either a session identifier or signed token such as a JSON Web Token (JWT).

Session IDs are most commonly stored in a database. They can be immediately revoked, but require a database query to be made on each request.

In contrast, JWT generally are not checked against a datastore, which means they cannot be immediately revoked. The advantage of this method is improved latency and reduced load on your datastore.

## Integration points

Auth [cookies](@sveltejs-kit#Cookies) can be checked inside the [`handle`](hooks#handle) hook. If a user is found matching the provided credentials, the user information can be stored in [`locals`](hooks#handle-locals).

### Protecting routes

To guard a group of routes, do the check in `handle` rather than in a `+layout.server.js` `load` function. `handle` runs before any `load` function and before the route is rendered, so it covers every descendant of a path in one place. A `+layout.server.js` guard, by contrast, only takes effect for pages whose `load` (or a child's) awaits `parent()` — otherwise the page's own `load` runs concurrently and can reach protected code first.

```js
/// file: src/hooks.server.js
// @filename: ambient.d.ts
type User = {
	name: string;
};

declare namespace App {
	interface Locals {
		user?: User;
	}
}

const getUserInformation: (session: string | void) => Promise<User | null>;

// @filename: index.js
// ---cut---
import { redirect } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit/hooks').Handle} */
export async function handle({ event, resolve }) {
	const session = event.cookies.get('sessionid');
	event.locals.user = (await getUserInformation(session)) ?? undefined;

	if (!event.locals.user && event.url.pathname.startsWith('/private')) {
		redirect(303, '/login');
	}

	return resolve(event);
}
```

A few things worth knowing:

- `handle` also runs when SvelteKit [crawls your pages during prerendering](hooks#handle), so match on a path prefix rather than on a list of routes that may not exist yet at that point.
- Prerendered pages and static assets are not handled by SvelteKit, so they cannot be protected this way. Move anything sensitive out of the prerendered output.
- Authorization is a separate concern from authentication. Storing a user in `locals` proves _who_ they are; it does not prove they may touch the data they are asking for. Check that per route in server `load` functions and remote functions, where the route and its params are known.

Remote functions can be protected directly as well. Inside a `query`, `form` or `command` you can obtain the current request with [`getRequestEvent`](remote-functions#Using-getRequestEvent) and run the same check, which keeps the auth logic next to the data it guards. Unlike `handle`, this runs only for the remote function it guards, so use both rather than one.

## Libraries

The [Svelte CLI](/docs/cli) gives the option to [set up Better Auth](https://svelte.dev/docs/cli/better-auth) with a new project or add it to an existing project.

## Guides

If you'd like to implement your own auth system, [the Lucia auth guide](https://lucia-auth.com/) provides a reference for session-based web app auth with SvelteKit examples.
