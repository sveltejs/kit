---
title: Auth
---

Auth refers to authentication and authorization, which are common needs when building a web application. Authentication means verifying that the user is who they say they are based on their provided credentials. Authorization means determining which actions they are allowed to take.

## Sessions vs tokens

After the user has provided their credentials such as a username and password, we want to allow them to use the application without needing to provide their credentials again for future requests. Users are commonly authenticated on subsequent requests with either a session identifier or signed token such as a JSON Web Token (JWT).

Session IDs are most commonly stored in a database. They can be immediately revoked, but require a database query to be made on each request.

In contrast, JWT generally are not checked against a datastore, which means they cannot be immediately revoked. The advantage of this method is improved latency and reduced load on your datastore.

## Integration points

Auth [cookies](@sveltejs-kit#Cookies) can be checked inside the [`handle`](hooks#handle) hook. If a user is found matching the provided credentials, the user information can be stored in [`locals`](hooks#handle-locals):

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
/** @type {import('@sveltejs/kit/hooks').Handle} */
export async function handle({ event, resolve }) {
	event.locals.user = await getUserInformation(event.cookies.get('sessionid'));

	return resolve(event);
}
```

You can then use [`getRequestEvent`]($app-server#getRequestEvent) to read `locals.user` and check if the user is authenticated. This check can live in a shared helper, then reused in each load function, as shown in [this example](load#Using-getRequestEvent).

> [!NOTE] Always prefer checks in `+page.server.js` over `+layout.server.js` — see [implications for authentication](load#Implications-for-authentication)

### Protecting multiple routes

To protect your private routes, add an authentication guard that checks against a whitelist of public routes in your `handle` hook:

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
import { redirect } from '@sveltejs/kit';

const PUBLIC_ROUTES = new Set(['/', '/login', '/signup']);

/** @type {import('@sveltejs/kit/hooks').Handle} */
export async function handle({ event, resolve }) {
	event.locals.user = await getUserInformation(event.cookies.get('sessionid'));

	if (!event.locals.user && !PUBLIC_ROUTES.has(event.route.id ?? '')) {
		redirect(303, '/login');
	}

	return resolve(event);
}
```

Whenever possible, you should match on `event.route.id` rather than `event.url.pathname` because `event.route.id` is the actual route the SvelteKit router has matched, and therefore represents the content that will be served if the request is allowed to progress. Simple string checks against the URL's pathname can run into all sorts of issues — for example, the URL pathname can be [encoded](advanced-routing#Encoding), so a check such as `event.url.pathname.startsWith('/admin')` can be bypassed with the encoded equivalent `/%61dmin`. If you absolutely must match on any raw part of the URL, ensure you use proper decoding and write thorough tests.

> [!NOTE] Prerendered pages and static assets are served without invoking `handle`, so they can't be protected this way.

### Remote functions

If you're using [remote functions](remote-functions), you _must_ run the authentication check directly inside the function — see [implications for authentication](remote-functions#Implications-for-authentication).

## Libraries

The [Svelte CLI](/docs/cli) gives the option to [set up Better Auth](/docs/cli/better-auth) with a new project or add it to an existing project.

## Guides

If you'd like to implement your own auth system, [Pilcrow's Auth Book](https://auth.pilcrowonpaper.com/) provides a reference for session-based web app auth . There's also a [simple example](https://github.com/lucia-auth/lucia/blob/main/code/auth_session.ts) of how to implement this generally.
