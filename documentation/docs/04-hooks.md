---
title: Hooks
---

An optional `src/hooks.js` (or `src/hooks.ts`, or `src/hooks/index.js`) file exports three functions, all optional, that run on the server — **getContext**, **getSession** and **handle**.

> The location of this file can be [configured](#configuration) as `config.kit.files.hooks`

### getContext

This function runs on every incoming request. It generates the `context` object that is available to [endpoint handlers](#routing-endpoints) as `request.context`, and used to derive the [`session`](#hooks-getsession) object available in the browser.

If unimplemented, context is `{}`.

```ts
type Incoming = {
	method: string;
	host: string;
	headers: Headers;
	path: string;
	query: URLSearchParams;
	body: string | Buffer | ReadOnlyFormData;
};

type GetContext<Context = any> = {
	(incoming: Incoming): Context;
};
```

```js
import * as cookie from 'cookie';
import db from '$lib/db';

/** @type {import('@sveltejs/kit').GetContext} */
export async function getContext({ headers }) {
	const cookies = cookie.parse(headers.cookie || '');

	return {
		user: (await db.get_user(cookies.session_id)) || { guest: true }
	};
}
```

### getSession

This function takes the [`context`](#hooks-getcontext) object and returns a `session` object that is safe to expose to the browser. It runs whenever SvelteKit renders a page.

If unimplemented, session is `{}`.

```ts
type GetSession<Context = any, Session = any> = {
	({ context }: { context: Context }): Session | Promise<Session>;
};
```

```js
/** @type {import('@sveltejs/kit').GetSession} */
export function getSession({ context }) {
	return {
		user: {
			// only include properties needed client-side —
			// exclude anything else attached to the user
			// like access tokens etc
			name: context.user?.name,
			email: context.user?.email,
			avatar: context.user?.avatar
		}
	};
}
```

> `session` must be serializable, which means it must not contain things like functions or custom classes, just built-in JavaScript data types

### handle

This function runs on every request, and determines the response. The second argument, `render`, calls SvelteKit's default renderer. This allows you to modify response headers or bodies, or bypass SvelteKit entirely (for implementing endpoints programmatically, for example).

If unimplemented, defaults to `(request, render) => render(request)`.

```ts
type Request<Context = any> = {
	method: string;
	host: string;
	headers: Headers;
	path: string;
	params: Record<string, string>;
	query: URLSearchParams;
	body: string | Buffer | ReadOnlyFormData;
	context: Context;
};

type Response = {
	status?: number;
	headers?: Headers;
	body?: any;
};

type Handle<Context = any> = (
	request: Request<Context>,
	render: (request: Request<Context>) => Promise<Response>
) => Response | Promise<Response>;
```

```js
/** @type {import('@sveltejs/kit').Handle} */
export async function handle(request, render) {
	const response = await render(request);

	return {
		...response,
		headers: {
			...response.headers,
			'x-custom-header': 'potato'
		}
	};
}
```
