---
title: Setup
---

An optional `src/setup.js` (or `src/setup.ts`, or `src/setup/index.js`) file exports two functions that run on the server — **prepare** and **getSession**.

Both functions, if provided, run for every page or endpoint request SvelteKit receives.

> The location of this file can be [configured](#configuration) as `config.kit.files.setup`

### prepare

This function receives the incoming headers and can return `context` and outgoing `headers`:

```js
/**
 * @param {{
 *   headers: Record<string, string>
 * }} incoming
 * @returns {Promise<{
 *   headers?: Record<string, string>
 *   context?: any
 * }>}
 */
export async function prepare({ headers }) {
	return {
		headers: {...},
		context: {...}
	};
}
```

The outgoing `headers` will be added to the response alongside any headers returned from individual endpoints (which take precedence). This is useful for setting cookies, for example:

```js
import * as cookie from 'cookie';
import { v4 as uuid } from '@lukeed/uuid';

export async function prepare(incoming) {
	const cookies = cookie.parse(incoming.headers.cookie || '');

	const headers = {};
	if (!cookies.session_id) {
		headers['set-cookie'] = `session_id=${uuid()}; HttpOnly`;
	}

	return {
		headers
	};
}
```

The `context` is passed to endpoints, and is used by `getSession` to derive a session object which is available in the browser. It's a good place to store information about the current user, for example.

```diff
import * as cookie from 'cookie';
import { v4 as uuid } from '@lukeed/uuid';
+import db from '$lib/db';

export async function prepare(incoming) {
	const cookies = cookie.parse(incoming.headers.cookie || '');

	const headers = {};
	if (!cookies.session_id) {
		headers['set-cookie'] = `session_id=${uuid()}; HttpOnly`;
	}

	return {
-		headers
+		headers,
+		context: {
+			user: await db.get_user(cookies.session_id)
+		}
	};
}
```


### getSession

This function takes the `context` returned from `prepare` and returns a `session` object that is safe to expose to the browser.

```js
/**
 * @param {{
 *   context: any
 * }} options
 * @returns {any}
 */
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