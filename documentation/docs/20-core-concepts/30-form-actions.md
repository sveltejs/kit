---
title: Form actions
---

A `+page.server.js` file can export _actions_, which allow you to `POST` data to the server using the `<form>` element.

When using `<form>`, client-side JavaScript is optional, but you can easily _progressively enhance_ your form interactions with JavaScript to provide the best user experience.

## Default actions

In the simplest case, a page declares a `default` action:

```js
/// file: src/routes/login/+page.server.js
/** @satisfies {import('./$types').Actions} */
export const actions = {
	default: async (event) => {
		// TODO log the user in
	}
};
```

To invoke this action from the `/login` page, just add a `<form>` — no JavaScript needed:

```svelte
<!--- file: src/routes/login/+page.svelte --->
<form method="POST">
	<label>
		Email
		<input name="email" type="email">
	</label>
	<label>
		Password
		<input name="password" type="password">
	</label>
	<button>Log in</button>
</form>
```

If someone were to click the button, the browser would send the form data via `POST` request to the server, running the default action.

> [!NOTE] Actions always use `POST` requests, since `GET` requests should never have side-effects.

We can also invoke the action from other pages (for example if there's a login widget in the nav in the root layout) by adding the `action` attribute, pointing to the page:

```html
/// file: src/routes/+layout.svelte
<form method="POST" action="/login">
	<!-- content -->
</form>
```

Submitting this form takes you to `/login`, whether the action succeeds or fails — that's what the browser does, and [`use:enhance`](#Progressive-enhancement-use:enhance) emulates it. If you'd rather stay where you are and handle the result in place, there's a recipe for that in the [progressive enhancement](#Progressive-enhancement-use:enhance) section.

## Named actions

Instead of one `default` action, a page can have as many named actions as it needs:

```js
/// file: src/routes/login/+page.server.js
/** @satisfies {import('./$types').Actions} */
export const actions = {
---	default: async (event) => {---
+++	login: async (event) => {+++
		// TODO log the user in
	},
+++	register: async (event) => {
		// TODO register the user
	}+++
};
```

To invoke a named action, add a query parameter with the name prefixed by a `/` character:

```svelte
<!--- file: src/routes/login/+page.svelte --->
<form method="POST" action="?/register">
```

```svelte
<!--- file: src/routes/+layout.svelte --->
<form method="POST" action="/login?/register">
```

As well as the `action` attribute, we can use the `formaction` attribute on a button to `POST` the same form data to a different action than the parent `<form>`:

```svelte
/// file: src/routes/login/+page.svelte
<form method="POST" +++action="?/login"+++>
	<label>
		Email
		<input name="email" type="email">
	</label>
	<label>
		Password
		<input name="password" type="password">
	</label>
	<button>Log in</button>
	+++<button formaction="?/register">Register</button>+++
</form>
```

> [!NOTE] We can't have default actions next to named actions, because if you POST to a named action without a redirect, the query parameter is persisted in the URL, which means the next default POST would go through the named action from before.

## Anatomy of an action

Each action receives a `RequestEvent` object, allowing you to read the data with `request.formData()`. After processing the request (for example, logging the user in by setting a cookie), the action can respond with data that will be available through the `form` property on the corresponding page and through `page.form` app-wide until the next update.

```js
/// file: src/routes/login/+page.server.js
// @filename: ambient.d.ts
declare module '#lib/server/db';

// @filename: index.js
// ---cut---
import * as db from '#lib/server/db';

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) {
	const user = await db.getUserFromSession(cookies.get('sessionid'));
	return { user };
}

/** @satisfies {import('./$types').Actions} */
export const actions = {
	login: async ({ cookies, request }) => {
		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

		const user = await db.getUser(email);
		cookies.set('sessionid', await db.createSession(user), { path: '/' });

		return { success: true };
	},
	register: async (event) => {
		// TODO register the user
	}
};
```

```svelte
<!--- file: src/routes/login/+page.svelte --->
<script>
	/** @type {import('./$types').PageProps} */
	let { data, form } = $props();
</script>

{#if form?.success}
	<!-- this message is ephemeral; it exists because the page was rendered in
	       response to a form submission. it will vanish if the user reloads -->
	<p>Successfully logged in! Welcome back, {data.user.name}</p>
{/if}
```

> [!LEGACY]
> `PageProps` was added in 2.16.0. In earlier versions, you had to type the `data` and `form` properties individually:
> ```js
> /// file: +page.svelte
> /** @type {{ data: import('./$types').PageData, form: import('./$types').ActionData }} */
> let { data, form } = $props();
> ```
>
> In Svelte 4, you'd use `export let data` and `export let form` instead to declare properties.

### Validation errors

If the request couldn't be processed because of invalid data, you can return validation errors — along with the previously submitted form values — back to the user so that they can try again. The `fail` function lets you return an HTTP status code (typically 400 or 422, in the case of validation errors) along with the data. The status code is available through `page.status` and the data through `form`:

When using `use:enhance` (or making a `fetch` request with the `accept: application/json` header), the HTTP response status code will match the status code passed to `fail`. When an action returns data, the response will have status 200, and when it returns nothing (i.e. `undefined`), the response will have status 204. This makes it easier to track form submission outcomes using observability tools.

```js
/// file: src/routes/login/+page.server.js
// @filename: ambient.d.ts
declare module '#lib/server/db';

// @filename: index.js
// ---cut---
+++import { fail } from '@sveltejs/kit';+++
import * as db from '#lib/server/db';

/** @satisfies {import('./$types').Actions} */
export const actions = {
	login: async ({ cookies, request }) => {
		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

+++		if (!email) {
			return fail(400, { email, missing: true });
		}+++

		const user = await db.getUser(email);

+++		if (!user || user.password !== db.hash(password)) {
			return fail(400, { email, incorrect: true });
		}+++

		cookies.set('sessionid', await db.createSession(user), { path: '/' });

		return { success: true };
	},
	register: async (event) => {
		// TODO register the user
	}
};
```

> [!NOTE] Note that as a precaution, we only return the email back to the page — not the password.

```svelte
/// file: src/routes/login/+page.svelte
<form method="POST" action="?/login">
+++	{#if form?.missing}<p class="error">The email field is required</p>{/if}
	{#if form?.incorrect}<p class="error">Invalid credentials!</p>{/if}+++
	<label>
		Email
		<input name="email" type="email" +++value={form?.email ?? ''}+++>
	</label>
	<label>
		Password
		<input name="password" type="password">
	</label>
	<button>Log in</button>
	<button formaction="?/register">Register</button>
</form>
```

The returned data must be serializable as JSON. Beyond that, the structure is entirely up to you. For example, if you had multiple forms on the page, you could distinguish which `<form>` the returned `form` data referred to with an `id` property or similar.

### Redirects

Redirects (and errors) work exactly the same as in [`load`](load#Redirects):

```js
// @errors: 2345
/// file: src/routes/login/+page.server.js
// @filename: ambient.d.ts
declare module '#lib/server/db';

// @filename: index.js
// ---cut---
import { fail, +++redirect+++ } from '@sveltejs/kit';
import * as db from '#lib/server/db';

/** @satisfies {import('./$types').Actions} */
export const actions = {
	login: async ({ cookies, request, +++url+++ }) => {
		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

		const user = await db.getUser(email);
		if (!user) {
			return fail(400, { email, missing: true });
		}

		if (user.password !== db.hash(password)) {
			return fail(400, { email, incorrect: true });
		}

		cookies.set('sessionid', await db.createSession(user), { path: '/' });

+++		if (url.searchParams.has('redirectTo')) {
			redirect(303, url.searchParams.get('redirectTo'));
		}+++

		return { success: true };
	},
	register: async (event) => {
		// TODO register the user
	}
};
```

## Loading data

After an action runs, the page will be re-rendered (unless a redirect or an unexpected error occurs), with the action's return value available to the page as the `form` prop. This means that your page's `load` functions will run after the action completes.

Note that `handle` runs before the action is invoked, and does not rerun before the `load` functions. This means that if, for example, you use `handle` to populate `event.locals` based on a cookie, you must update `event.locals` when you set or delete the cookie in an action:

```js
/// file: src/hooks.server.js
// @filename: ambient.d.ts
declare namespace App {
	interface Locals {
		user: {
			name: string;
		} | null
	}
}

// @filename: global.d.ts
declare global {
	function getUser(sessionid: string | undefined): {
		name: string;
	};
}

export {};

// @filename: index.js
// ---cut---
/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	event.locals.user = await getUser(event.cookies.get('sessionid'));
	return resolve(event);
}
```

```js
/// file: src/routes/account/+page.server.js
// @filename: ambient.d.ts
declare namespace App {
	interface Locals {
		user: {
			name: string;
		} | null
	}
}

// @filename: index.js
// ---cut---
/** @type {import('./$types').PageServerLoad} */
export function load(event) {
	return {
		user: event.locals.user
	};
}

/** @satisfies {import('./$types').Actions} */
export const actions = {
	logout: async (event) => {
		event.cookies.delete('sessionid', { path: '/' });
		event.locals.user = null;
	}
};
```

## Progressive enhancement

In the preceding sections we built a `/login` action that [works without client-side JavaScript](https://kryogenix.org/code/browser/everyonehasjs.html) — not a `fetch` in sight. That's great, but when JavaScript _is_ available we can progressively enhance our form interactions to provide a better user experience.

### use:enhance

The easiest way to progressively enhance a form is to add the `use:enhance` action:

```svelte
/// file: src/routes/login/+page.svelte
<script>
	+++import { enhance } from '$app/forms';+++

	/** @type {import('./$types').PageProps} */
	let { form } = $props();
</script>

<form method="POST" +++use:enhance+++>
```

> [!NOTE] `use:enhance` can only be used with forms that have `method="POST"` and point to actions defined in a `+page.server.js` file. It will not work with `method="GET"`, which is the default for forms without a specified method. Attempting to use `use:enhance` on forms without `method="POST"` or posting to a `+server.js` endpoint will result in an error.

> [!NOTE] Yes, it's a little confusing that the `enhance` action and `<form action>` are both called 'action'. These docs are action-packed. Sorry.

Without an argument, `use:enhance` will emulate the browser-native behaviour, just without the full-page reloads. It will:

- if the action is on the page you're submitting from, emulate a reload of the current page — updating the `form` property, `page.form` and `page.status` on a successful or invalid response
- if the action is on a different page (for example `<form action="/somewhere/else" ..>`), navigate to the action's URL on a successful _or_ invalid response, populating that page's `form` property and `page.status`, just as a native submission would. A new history entry is pushed
- reset the `<form>` element
- refresh all data using `refreshAll` on a successful response
- call `goto` on a redirect response
- render the nearest `+error` boundary if an unexpected error occurs — the boundary nearest the _action's_ route, if the action is on a different page
- [reset focus](accessibility#Focus-management) to the appropriate element

> [!NOTE] Two details are worth knowing about the URL:
>
> Where a submission lands is `result.location` — the form's `action` with the `?/actionName` parameter removed, since that parameter has done its job once the action has run. `action="/login?/do-login"` lands on `/login`, and any other query parameters are kept, so `action="/login?redirectTo=/dashboard&/do-login"` lands on `/login?redirectTo=/dashboard`. The destination's `load` functions see that URL via `url.search`.
>
> Two consequences worth knowing:
>
> - A _relative_ action replaces the entire query string as a side effect of URL resolution — `action="?/delete"` on `/items?page=2` resolves to `/items?/delete`, so both enhanced and native submissions drop `page=2`. Write `action="?page=2&/delete"` to preserve it.
> - Without JavaScript the browser can't strip anything, so an unenhanced submission leaves you on the raw action URL (`/login?/do-login`). Reloading that URL is a plain `GET`, which doesn't re-run the action and renders the page normally, so the difference is cosmetic — but a `load` function can observe a different `url.search` depending on whether JavaScript is available.

If you don't want a cross-page submission to navigate — a common need for login or newsletter widgets that live in a layout and post to another page's action — pass `navigate: false` to `update`, which gives you the same behaviour as SvelteKit 2:

```svelte
<form
	method="POST"
	action="/other/page?/subscribe"
	use:enhance={() => async ({ update }) => {
		await update({ navigate: false });
	}}
>
```

The result is applied to the page you're on: `form`, `page.form` and `page.status` are updated, and error results render the current route's nearest `+error` boundary.

### Customising use:enhance

To customise the behaviour, you can provide a `SubmitFunction` that runs immediately before the form is submitted, and (optionally) returns a callback that runs with the `ActionResult`.

```svelte
<form
	method="POST"
	use:enhance={({ formElement, formData, action, cancel, submitter }) => {
		// `formElement` is this `<form>` element
		// `formData` is its `FormData` object that's about to be submitted
		// `action` is the URL to which the form is posted
		// calling `cancel()` will prevent the submission
		// `submitter` is the `HTMLElement` that caused the form to be submitted

		return async ({ result, update }) => {
			// `result` is an `ActionResult` object
			// `update` is a function which triggers the default logic that would be triggered if this callback wasn't set
		};
	}}
>
```

You can use these functions to show and hide loading UI, and so on.

If you return a callback, you override the default post-submission behavior. To get it back, call `update`, which accepts `navigate`, `refreshAll` and `reset` parameters, or use `applyAction` on the result:

```svelte
/// file: src/routes/login/+page.svelte
<script>
	import { enhance, +++applyAction+++ } from '$app/forms';

	/** @type {import('./$types').PageProps} */
	let { form } = $props();
</script>

<form
	method="POST"
	use:enhance={({ formElement, formData, action, cancel }) => {
		return async ({ result }) => {
			// `result` is an `ActionResult` object
+++			if (result.type === 'redirect') {
				goto(result.location);
			} else {
				await applyAction(result);
			}+++
		};
	}}
>
```

> [!NOTE] `update` accepts these options:
>
> - `reset: false` if you don't want the `<form>` values to be reset after a successful submission
> - `refreshAll` controls whether all data is refreshed after submission. It defaults to `true` for successful results and `false` for failures. When the submission navigates to another page, setting it to `false` does _not_ prevent the destination's own `load` functions from running — it only allows shared layout data to be reused. `invalidateAll` is a deprecated alias for `refreshAll`
> - `navigate: false` applies a non-redirect result to the current page instead of navigating to `result.location`. Redirects are always followed

The behaviour of `applyAction(result)` depends on `result.type`:

- `success`, `failure` — sets `page.status` to `result.status` and updates `form` and `page.form` to `result.data`
- `redirect` — calls `goto(result.location, { refreshAll: true })`
- `error` — renders the current route's nearest `+error` boundary with `result.error`

In all cases, [focus will be reset](accessibility#Focus-management). `applyAction` does not navigate to the `location` of a non-redirect result or refresh data. Use `update` to get the complete default enhanced behavior, including carrying form data and status into a cross-page navigation. When implementing enhancement manually, inspect `result.location` and use [`goto`]($app-navigation#goto) or [`refreshAll`]($app-navigation#refreshAll) as appropriate.

### Custom event listener

We can also implement progressive enhancement ourselves, without `use:enhance`, with a normal event listener on the `<form>`:

```svelte
<!--- file: src/routes/login/+page.svelte --->
<script>
	import { refreshAll, goto } from '$app/navigation';
	import { applyAction, deserialize } from '$app/forms';

	/** @type {import('./$types').PageProps} */
	let { form } = $props();

	/** @param {SubmitEvent & { currentTarget: EventTarget & HTMLFormElement}} event */
	async function handleSubmit(event) {
		event.preventDefault();
		const data = new FormData(event.currentTarget, event.submitter);

		const response = await fetch(event.currentTarget.action, {
			method: 'POST',
			body: data
		});

		/** @type {import('$app/forms').ActionResult} */
		const result = deserialize(await response.text());

		if (result.type !== 'redirect' && result.location !== undefined) {
			if (result.location === location.pathname + location.search) {
				if (result.type === 'success') await refreshAll();
			} else {
				await goto(result.location, { refreshAll: result.type === 'success' });
			}
		}

		await applyAction(result);
	}
</script>

<form method="POST" onsubmit={handleSubmit}>
	<!-- content -->
</form>
```

Note that you need to `deserialize` the response before processing it further using the corresponding method from `$app/forms`. `JSON.parse()` isn't enough because form actions - like `load` functions - also support returning `Date` or `BigInt` objects.

If you have a `+server.js` alongside your `+page.server.js`, `fetch` requests will be routed there by default. To `POST` to an action in `+page.server.js` instead, use the custom `x-sveltekit-action` header:

```js
// @errors: 2532 2304
const response = await fetch(this.action, {
	method: 'POST',
	body: data,
+++	headers: {
		'x-sveltekit-action': 'true'
	}+++
});
```

## Alternatives

Form actions are the preferred way to send data to the server, since they can be progressively enhanced, but you can also use [`+server.js`](routing#server) files to expose (for example) a JSON API. Here's how such an interaction could look like:

```svelte
<!--- file: src/routes/send-message/+page.svelte --->
<script>
	function rerun() {
		fetch('/api/ci', {
			method: 'POST'
		});
	}
</script>

<button onclick={rerun}>Rerun CI</button>
```

```js
// @errors: 2355 1360 2322
/// file: src/routes/api/ci/+server.js
/** @type {import('./$types').RequestHandler} */
export function POST() {
	// do something
}
```

## GET vs POST

As we've seen, to invoke a form action you must use `method="POST"`.

Some forms don't need to `POST` data to the server — search inputs, for example. For these you can use `method="GET"` (or, equivalently, no `method` at all), and SvelteKit will treat them like `<a>` elements, using the client-side router instead of a full page navigation:

```html
<form action="/search">
	<label>
		Search
		<input name="q">
	</label>
</form>
```

Submitting this form will navigate to `/search?q=...` and invoke your load function but will not invoke an action. As with `<a>` elements, you can set the [`data-sveltekit-reload`](link-options#data-sveltekit-reload), [`data-sveltekit-replacestate`](link-options#data-sveltekit-replacestate) and [`data-sveltekit-reset`](link-options#data-sveltekit-reset) attributes on the `<form>` to control the router's behaviour.

## Further reading

- [Tutorial: Forms](/tutorial/kit/the-form-element)
