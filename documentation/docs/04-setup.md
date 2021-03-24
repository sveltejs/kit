---
title: Setup
---

An optional `src/setup.js` (or `src/setup.ts`, or `src/setup/index.js`) file exports three functions that run on the server — **prepare**, **transformTemplate** and **getSession**.

These functions, if provided, run for every page or endpoint request SvelteKit receives.

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

	const darkMode = cookies.darkMode || false;

	return {
-		headers
+		headers,
+		context: {
+			user: await db.get_user(cookies.session_id),
+			darkMode,
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

### transformTemplate

This function takes the `src/app.html template` and the `context` returned from `prepare`. It should return the template after transforming it.

```js
/**
 * @param {{
 *   template: string
 *   context: any
 * }} options
 * @returns {string}
 */
export function getSession({ context, template }) {
	if (!context.darkMode) {
		return template;
	}

	return template.replace('%My.HtmlClass%', 'dark');
}
```

> The corresponding `src/app.html` file would look like this:

```html
<!DOCTYPE html>
<html class="%My.HtmlClass%" lang="en">
	<head>
		<meta charset="utf-8" />
		<link rel="icon" href="/favicon.ico" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		%svelte.head%
	</head>
	<body>
		<div id="svelte">%svelte.body%</div>
	</body>
</html>
```
