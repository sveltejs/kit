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

You can then use [`getRequestEvent`]($app-server#getRequestEvent) to read `locals.user` and check if the user is authenticated. This check can live in a shared helper:

```js
/// file: src/lib/server/auth.js
// @filename: ambient.d.ts
interface User {
	name: string;
}

declare namespace App {
	interface Locals {
		user?: User;
	}
}

// @filename: index.ts
// ---cut---
import { redirect } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';

export function requireLogin() {
	const { locals } = getRequestEvent();

	// assume `locals.user` is populated in `handle`
	if (!locals.user) redirect(303, '/login');

	return locals.user;
}
```

Finally, call `requireLogin` in any page [`load` function](load) (or [form action](form-actions), for example) to guarantee that the user is logged in:

```js
/// file: +page.server.js
// @filename: ambient.d.ts

declare module '#lib/server/auth.js' {
	interface User {
		name: string;
	}

	export function requireLogin(): User;
}

// @filename: index.ts
// ---cut---
import { requireLogin } from '#lib/server/auth.js';

export function load() {
	const user = requireLogin();

	// `user` is guaranteed to be a user object here, because otherwise
	// `requireLogin` would throw a redirect and we wouldn't get here
	return {
		message: `hello ${user.name}!`
	};
}
```

Always prefer checks in `+page.server.js` over `+layout.server.js` — see [implications for authentication](load#Implications-for-authentication).

### Protecting multiple routes

Inside your `handle` hook, add an authentication guard that only succeeds if the request matches a public route ID. This way, a route that you forget to list stays protected:

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

	if (!event.locals.user && !PUBLIC_ROUTES.has(event.route.id ?? '')) {
		redirect(303, '/login');
	}

	return resolve(event);
}
```

You should always match on `event.route.id` rather than `event.url.pathname` because the pathname is [encoded](advanced-routing#Encoding). Avoid a check such as `event.url.pathname.startsWith('/admin')` as it can be bypassed with `/%61dmin`.

> [!NOTE] Prerendered pages and static assets are served without invoking the server's `handle` hook.

### Remote functions

If you're using [remote functions](remote-functions), place the authentication check inside the function to protect it wherever it is used:

```js
/// file: src/lib/projects.remote.js
// @filename: ambient.d.ts
declare module '#lib/server/auth.js' {
	export function requireLogin(): { id: string; name: string };
}

declare module '#lib/server/database.js' {
	export function getProjects(
		userId: string
	): Promise<Array<{ id: string; name: string; updatedAt: Date }>>;
}

// @filename: index.js
// ---cut---
import { query } from '$app/server';
import { requireLogin } from '#lib/server/auth.js';
import { getProjects } from '#lib/server/database.js';

export const getMyProjects = query(async () => {
	const user = requireLogin();

	return await getProjects(user.id);
});
```

Now, any component that calls your remote function will only succeed if the user is logged in, regardless of which page renders it:

```svelte
<!--- file: src/lib/ProjectList.svelte --->
<script>
	import { getMyProjects } from '$lib/projects.remote';
</script>

<ul>
	{#each await getMyProjects() as project}
		<li><a href="/projects/{project.id}">{project.name}</a></li>
	{/each}
</ul>
```

> [!NOTE] Don't use `event.url`, `event.route` or `event.params` to decide access inside remote functions. They describe the page the function was called from, which the client controls (and could therefore be manipulated).

## Libraries

The [Svelte CLI](/docs/cli) gives the option to [set up Better Auth](/docs/cli/better-auth) with a new project or add it to an existing project.

## Guides

If you'd like to implement your own auth system, [the Lucia auth guide](https://lucia-auth.com/) provides a reference for session-based web app auth with SvelteKit examples.
