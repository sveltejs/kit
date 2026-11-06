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

## Protecting routes

To require a logged-in user across your app, check in `handle`, which runs before any `load` function. List the routes that are public and protect everything else, so that a route you forget to list stays protected:

```js
/// file: src/hooks.server.js
// @filename: ambient.d.ts
type User = {
	name: string;
};

declare namespace App {
	interface Locals {
		user: User | null;
	}
}

const getUserInformation: (cookie: string | void) => Promise<User | null>;

// @filename: index.js
// ---cut---
import { error, redirect } from '@sveltejs/kit';

const PUBLIC_ROUTES = new Set(['/', '/login', '/signup']);

/** @type {import('@sveltejs/kit/hooks').Handle} */
export async function handle({ event, resolve }) {
	event.locals.user = await getUserInformation(event.cookies.get('sessionid'));

	if (!event.locals.user) {
		if (event.isRemoteRequest) error(401);
		if (!PUBLIC_ROUTES.has(event.route.id ?? '')) redirect(303, '/login');
	}

	return resolve(event);
}
```

- Match on `event.route.id`, not `event.url.pathname`. The pathname is percent-encoded (`/管理` arrives as `/%E7%AE%A1%E7%90%86`) and is the URL before [`reroute`](hooks#reroute), so it can differ from the route that renders. A check like `event.url.pathname.startsWith('/admin')` can be bypassed with `/%61dmin`, and never matches non-ASCII paths at all.
- For [remote function](remote-functions) requests, `event.route` and `event.url` describe the page the function was called from, which the client controls. Don't use them to decide access. The example above rejects every remote request from a logged-out user. If some remote functions must work without a session, such as a login form, skip remote requests in `handle` instead and check the user inside every remote function with [`getRequestEvent`]($app-server#getRequestEvent).
- Prerendered pages and static assets are served without running `handle`, so they can't be protected this way.
- This only checks that someone is logged in. Whether they may access a particular resource — an admin page, or another user's data — must be checked where that data is loaded or changed: in server `load` functions, form actions, `+server.js` handlers and remote functions.

## Libraries

The [Svelte CLI](/docs/cli) gives the option to [set up Better Auth](/docs/cli/better-auth) with a new project or add it to an existing project.

## Guides

If you'd like to implement your own auth system, [the Lucia auth guide](https://lucia-auth.com/) provides a reference for session-based web app auth with SvelteKit examples.
