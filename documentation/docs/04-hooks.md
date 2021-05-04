---
title: Hooks
---

An optional `src/hooks.js` (or `src/hooks.ts`, or `src/hooks/index.js`) file exports two functions, both optional, that run on the server — **handle** and **getSession**.

> The location of this file can be [configured](#configuration) as `config.kit.files.hooks`

### handle

This function runs on every request, and determines the response. It receives the `request` object and `render` method, which calls SvelteKit's default renderer. This allows you to modify response headers or bodies, or bypass SvelteKit entirely (for implementing endpoints programmatically, for example).

If unimplemented, defaults to `({ request, render }) => render(request)`.

To add custom data to the request, which is passed to endpoints, populate the `request.locals` object, as shown below.

```ts
type Request<Locals = Record<string, any>> = {
	method: string;
	host: string;
	headers: Headers;
	path: string;
	params: Record<string, string>;
	query: URLSearchParams;
	rawBody: string | ArrayBuffer;
	body: string | ArrayBuffer | ReadOnlyFormData | any;
	locals: Locals;
};

type Response = {
	status?: number;
	headers?: Headers;
	body?: any;
};

type Handle<Locals = Record<string, any>> = ({
	request: Request<Locals>,
	render: (request: Request<Locals>) => Promise<Response>
}) => Response | Promise<Response>;
```

```js
/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ request, render }) {
	request.locals.user = await getUserInformation(request.headers.cookie);

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

### getSession

This function takes the `request` object and returns a `session` object that is [accessible on the client](#modules-$app-stores) and therefore must be safe to expose to users. It runs whenever SvelteKit server-renders a page.

If unimplemented, session is `{}`.

```ts
type GetSession<Locals = Record<string, any>, Session = any> = {
	(request: Request<Locals>): Session | Promise<Session>;
};
```

```js
/** @type {import('@sveltejs/kit').GetSession} */
export function getSession(request) {
	return {
		user: {
			// only include properties needed client-side —
			// exclude anything else attached to the user
			// like access tokens etc
			name: request.locals.user?.name,
			email: request.locals.user?.email,
			avatar: request.locals.user?.avatar
		}
	};
}
```

> `session` must be serializable, which means it must not contain things like functions or custom classes, just built-in JavaScript data types
