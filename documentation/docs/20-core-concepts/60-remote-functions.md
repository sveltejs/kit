---
title: Remote functions
---

<blockquote class="since note">
	<p>Available since 2.27</p>
</blockquote>

Remote functions are a tool for type-safe communication between client and server. They can be _called_ anywhere in your app, but always _run_ on the server, meaning they can safely access [server-only modules](server-only-modules) containing things like environment variables and database clients.

Combined with Svelte's experimental support for [`await`](/docs/svelte/await-expressions), it allows you to load and manipulate data directly inside your components.

This feature is currently experimental, meaning it is likely to contain bugs and is subject to change without notice. You must opt in by adding the `kit.experimental.remoteFunctions` option in your `svelte.config.js`:

```js
/// file: svelte.config.js
export default {
	kit: {
		experimental: {
			+++remoteFunctions: true+++
		}
	}
};
```

## Overview

Remote functions are exported from a `.remote.js` or `.remote.ts` file, and come in four flavours: `query`, `form`, `command` and `prerender`. On the client, the exported functions are transformed to `fetch` wrappers that invoke their counterparts on the server via a generated HTTP endpoint. Remote files must be placed in your `src` directory.

## query

The `query` function allows you to read dynamic data from the server (for _static_ data, consider using [`prerender`](#prerender) instead):

```js
/// file: src/routes/blog/data.remote.js
// @filename: ambient.d.ts
declare module '$lib/server/database' {
	export function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]>;
}
// @filename: index.js
// ---cut---
import { query } from '$app/server';
import * as db from '$lib/server/database';

export const getPosts = query(async () => {
	const posts = await db.sql`
		SELECT title, slug
		FROM post
		ORDER BY published_at
		DESC
	`;

	return posts;
});
```

> [!NOTE] Throughout this page, you'll see imports from fictional modules like `$lib/server/database` and `$lib/server/auth`. These are purely for illustrative purposes — you can use whatever database client and auth setup you like.
>
> The `db.sql` function above is a [tagged template function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) that escapes any interpolated values.

The query returned from `getPosts` works as a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that resolves to `posts`:

```svelte
<!--- file: src/routes/blog/+page.svelte --->
<script>
	import { getPosts } from './data.remote';
</script>

<h1>Recent posts</h1>

<ul>
	{#each await getPosts() as { title, slug }}
		<li><a href="/blog/{slug}">{title}</a></li>
	{/each}
</ul>
```

Until the promise resolves — and if it errors — the nearest [`<svelte:boundary>`](../svelte/svelte-boundary) will be invoked.

While using `await` is recommended, as an alternative the query also has `loading`, `error` and `current` properties:

```svelte
<!--- file: src/routes/blog/+page.svelte --->
<script>
	import { getPosts } from './data.remote';

	const query = getPosts();
</script>

{#if query.error}
	<p>oops!</p>
{:else if query.loading}
	<p>loading...</p>
{:else}
	<ul>
		{#each query.current as { title, slug }}
			<li><a href="/blog/{slug}">{title}</a></li>
		{/each}
	</ul>
{/if}
```

> [!NOTE] For the rest of this document, we'll use the `await` form.

### Query arguments

Query functions can accept an argument, such as the `slug` of an individual post:

```svelte
<!--- file: src/routes/blog/[slug]/+page.svelte --->
<script>
	import { getPost } from '../data.remote';

	let { params } = $props();

	const post = $derived(await getPost(params.slug));
</script>

<h1>{post.title}</h1>
<div>{@html post.content}</div>
```

Since `getPost` exposes an HTTP endpoint, it's important to validate this argument to be sure that it's the correct type. For this, we can use any [Standard Schema](https://standardschema.dev/) validation library such as [Zod](https://zod.dev/) or [Valibot](https://valibot.dev/):

```js
/// file: src/routes/blog/data.remote.js
// @filename: ambient.d.ts
declare module '$lib/server/database' {
	export function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]>;
}
// @filename: index.js
// ---cut---
import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { query } from '$app/server';
import * as db from '$lib/server/database';

export const getPosts = query(async () => { /* ... */ });

export const getPost = query(v.string(), async (slug) => {
	const [post] = await db.sql`
		SELECT * FROM post
		WHERE slug = ${slug}
	`;

	if (!post) error(404, 'Not found');
	return post;
});
```

Both the argument and the return value are serialized with [devalue](https://github.com/sveltejs/devalue), which handles types like `Date` and `Map` (and custom types defined in your [transport hook](hooks#Universal-hooks-transport)) in addition to JSON.

### Refreshing queries

Any query can be updated via its `refresh` method:

```svelte
<button onclick={() => getPosts().refresh()}>
	Check for new posts
</button>
```

> [!NOTE] Queries are cached while they're on the page, meaning `getPosts() === getPosts()`. This means you don't need a reference like `const posts = getPosts()` in order to refresh the query.

## form

The `form` function makes it easy to write data to the server. It takes a callback that receives the current [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData)...


```ts
/// file: src/routes/blog/data.remote.js
// @filename: ambient.d.ts
declare module '$lib/server/database' {
	export function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]>;
}

declare module '$lib/server/auth' {
	interface User {
		name: string;
	}

	/**
	 * Gets a user's info from their cookies, using `getRequestEvent`
	 */
	export function getUser(): Promise<User | null>;
}
// @filename: index.js
// ---cut---
import * as v from 'valibot';
import { error, redirect } from '@sveltejs/kit';
import { query, form } from '$app/server';
import * as db from '$lib/server/database';
import * as auth from '$lib/server/auth';

export const getPosts = query(async () => { /* ... */ });

export const getPost = query(v.string(), async (slug) => { /* ... */ });

export const createPost = form(async (data) => {
	// Check the user is logged in
	const user = await auth.getUser();
	if (!user) error(401, 'Unauthorized');

	const title = data.get('title');
	const content = data.get('content');

	// Check the data is valid
	if (typeof title !== 'string' || typeof content !== 'string') {
		error(400, 'Title and content are required');
	}

	const slug = title.toLowerCase().replace(/ /g, '-');

	// Insert into the database
	await db.sql`
		INSERT INTO post (slug, title, content)
		VALUES (${slug}, ${title}, ${content})
	`;

	// Redirect to the newly created page
	redirect(303, `/blog/${slug}`);
});
```

...and returns an object that can be spread onto a `<form>` element. The callback is called whenever the form is submitted.

```svelte
<!--- file: src/routes/blog/new/+page.svelte --->
<script>
	import { createPost } from '../data.remote';
</script>

<h1>Create a new post</h1>

<form {...createPost}>
	<label>
		<h2>Title</h2>
		<input name="title" />
	</label>

	<label>
		<h2>Write your post</h2>
		<textarea name="content"></textarea>
	</label>

	<button>Publish!</button>
</form>
```

The form object contains `method` and `action` properties that allow it to work without JavaScript (i.e. it submits data and reloads the page). It also has an `onsubmit` handler that progressively enhances the form when JavaScript is available, submitting data *without* reloading the entire page.

### Single-flight mutations

By default, all queries used on the page (along with any `load` functions) are automatically refreshed following a successful form submission. This ensures that everything is up-to-date, but it's also inefficient: many queries will be unchanged, and it requires a second trip to the server to get the updated data.

Instead, we can specify which queries should be refreshed in response to a particular form submission. This is called a _single-flight mutation_, and there are two ways to achieve it. The first is to refresh the query on the server, inside the form handler:

```js
import * as v from 'valibot';
import { error, redirect } from '@sveltejs/kit';
import { query, form } from '$app/server';
const slug = '';
// ---cut---
export const getPosts = query(async () => { /* ... */ });

export const getPost = query(v.string(), async (slug) => { /* ... */ });

export const createPost = form(async (data) => {
	// form logic goes here...

	// Refresh `getPosts()` on the server, and send
	// the data back with the result of `createPost`
	+++await getPosts().refresh();+++

	// Redirect to the newly created page
	redirect(303, `/blog/${slug}`);
});
```

The second is to drive the single-flight mutation from the client, which we'll see in the section on [`enhance`](#form-enhance).

### Returns and redirects

The example above uses [`redirect(...)`](@sveltejs-kit#redirect), which sends the user to the newly created page. Alternatively, the callback could return data, in which case it would be available as `createPost.result`:

```ts
/// file: src/routes/blog/data.remote.js
// @filename: ambient.d.ts
declare module '$lib/server/database' {
	export function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]>;
}

declare module '$lib/server/auth' {
	interface User {
		name: string;
	}

	/**
	 * Gets a user's info from their cookies, using `getRequestEvent`
	 */
	export function getUser(): Promise<User | null>;
}
// @filename: index.js
import * as v from 'valibot';
import { error, redirect } from '@sveltejs/kit';
import { query, form } from '$app/server';
import * as db from '$lib/server/database';
import * as auth from '$lib/server/auth';

export const getPosts = query(async () => { /* ... */ });

export const getPost = query(v.string(), async (slug) => { /* ... */ });

// ---cut---
export const createPost = form(async (data) => {
	// ...

	return { success: true };
});
```

```svelte
<!--- file: src/routes/blog/new/+page.svelte --->
<script>
	import { createPost } from '../data.remote';
</script>

<h1>Create a new post</h1>

<form {...createPost}><!-- ... --></form>

{#if createPost.result?.success}
	<p>Successfully published!</p>
{/if}
```

This value is _ephemeral_ — it will vanish if you resubmit, navigate away, or reload the page.

> [!NOTE] The `result` value need not indicate success — it can also contain validation errors, along with any data that should repopulate the form on page reload.

If an error occurs during submission, the nearest `+error.svelte` page will be rendered.

### enhance

We can customize what happens when the form is submitted with the `enhance` method:

```svelte
<!--- file: src/routes/blog/new/+page.svelte --->
<script>
	import { createPost } from '../data.remote';
	import { showToast } from '$lib/toast';
</script>

<h1>Create a new post</h1>

<form {...createPost.enhance(async ({ form, data, submit }) => {
	try {
		await submit();
		form.reset();

		showToast('Successfully published!');
	} catch (error) {
		showToast('Oh no! Something went wrong');
	}
})}>
	<input name="title" />
	<textarea name="content"></textarea>
	<button>publish</button>
</form>
```

The callback receives the `form` element, the `data` it contains, and a `submit` function.

To enable client-driven [single-flight mutations](#form-Single-flight-mutations), use `submit().updates(...)`. For example, if the `getPosts()` query was used on this page, we could refresh it like so:

```ts
import type { RemoteQuery, RemoteQueryOverride } from '@sveltejs/kit';
interface Post {}
declare function submit(): Promise<any> & {
	updates(...queries: Array<RemoteQuery<any> | RemoteQueryOverride>): Promise<any>;
}

declare function getPosts(): RemoteQuery<Post[]>;
// ---cut---
await submit().updates(getPosts());
```

We can also _override_ the current data while the submission is ongoing:

```ts
import type { RemoteQuery, RemoteQueryOverride } from '@sveltejs/kit';
interface Post {}
declare function submit(): Promise<any> & {
	updates(...queries: Array<RemoteQuery<any> | RemoteQueryOverride>): Promise<any>;
}

declare function getPosts(): RemoteQuery<Post[]>;
declare const newPost: Post;
// ---cut---
await submit().updates(
	getPosts().withOverride((posts) => [newPost, ...posts])
);
```

The override will be applied immediately, and released when the submission completes (or fails).

### buttonProps

By default, submitting a form will send a request to the URL indicated by the `<form>` element's [`action`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/form#attributes_for_form_submission) attribute, which in the case of a remote function is a property on the form object generated by SvelteKit.

It's possible for a `<button>` inside the `<form>` to send the request to a _different_ URL, using the [`formaction`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button#formaction) attribute. For example, you might have a single form that allows you to login or register depending on which button was clicked.

This attribute exists on the `buttonProps` property of a form object:

```svelte
<!--- file: src/routes/login/+page.svelte --->
<script>
	import { login, register } from '$lib/auth';
</script>

<form {...login}>
	<label>
		Your username
		<input name="username" />
	</label>

	<label>
		Your password
		<input name="password" type="password" />
	</label>

	<button>login</button>
	<button {...register.buttonProps}>register</button>
</form>
```

Like the form object itself, `buttonProps` has an `enhance` method for customizing submission behaviour.

## command

The `command` function, like `form`, allows you to write data to the server. Unlike `form`, it's not specific to an element and can be called from anywhere.

> [!NOTE] Prefer `form` where possible, since it gracefully degrades if JavaScript is disabled or fails to load.

As with `query`, if the function accepts an argument it should be [validated](#query-Query-arguments) by passing a [Standard Schema](https://standardschema.dev) as the first argument to `command`.

```ts
/// file: likes.remote.js
// @filename: ambient.d.ts
declare module '$lib/server/database' {
	export function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]>;
}
// @filename: index.js
// ---cut---
import * as v from 'valibot';
import { query, command } from '$app/server';
import * as db from '$lib/server/database';

export const getLikes = query(v.string(), async (id) => {
	const [row] = await db.sql`
		SELECT likes
		FROM item
		WHERE id = ${id}
	`;

	return row.likes;
});

export const addLike = command(v.string(), async (id) => {
	await db.sql`
		UPDATE item
		SET likes = likes + 1
		WHERE id = ${id}
	`;
});
```

Now simply call `addLike`, from (for example) an event handler:

```svelte
<!--- file: +page.svelte --->
<script>
	import { getLikes, addLike } from './likes.remote';
	import { showToast } from '$lib/toast';

	let { item } = $props();
</script>

<button
	onclick={async () => {
		try {
			await addLike(item.id);
		} catch (error) {
			showToast('Something went wrong!');
		}
	}}
>
	add like
</button>

<p>likes: {await getLikes(item.id)}</p>
```

> [!NOTE] Commands cannot be called during render.

### Updating queries

To update `getLikes(item.id)`, or any other query, we need to tell SvelteKit _which_ queries need to be refreshed (unlike `form`, which by default invalidates everything, to approximate the behaviour of a native form submission).

We either do that inside the command itself...

```js
/// file: likes.remote.js
// @filename: ambient.d.ts
declare module '$lib/server/database' {
	export function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]>;
}
// @filename: index.js
// ---cut---
import * as v from 'valibot';
import { query, command } from '$app/server';
import * as db from '$lib/server/database';
// ---cut---
export const getLikes = query(v.string(), async (id) => { /* ... */ });

export const addLike = command(v.string(), async (id) => {
	await db.sql`
		UPDATE item
		SET likes = likes + 1
		WHERE id = ${id}
	`;

	+++getLikes(id).refresh();+++
});
```

...or when we call it:

```ts
import { RemoteCommand, RemoteQueryFunction } from '@sveltejs/kit';

interface Item { id: string }

declare const addLike: RemoteCommand<string, void>;
declare const getLikes: RemoteQueryFunction<string, number>;
declare function showToast(message: string): void;
declare const item: Item;
// ---cut---
try {
	await addLike(item.id).+++updates(getLikes(item.id))+++;
} catch (error) {
	showToast('Something went wrong!');
}
```

As before, we can use `withOverride` for optimistic updates:

```ts
import { RemoteCommand, RemoteQueryFunction } from '@sveltejs/kit';

interface Item { id: string }

declare const addLike: RemoteCommand<string, void>;
declare const getLikes: RemoteQueryFunction<string, number>;
declare function showToast(message: string): void;
declare const item: Item;
// ---cut---
try {
	await addLike(item.id).updates(
		getLikes(item.id).+++withOverride((n) => n + 1)+++
	);
} catch (error) {
	showToast('Something went wrong!');
}
```

## prerender

The `prerender` function is similar to `query`, except that it will be invoked at build time to prerender the result. Use this for data that changes at most once per redeployment.

```js
/// file: src/routes/blog/data.remote.js
// @filename: ambient.d.ts
declare module '$lib/server/database' {
	export function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]>;
}
// @filename: index.js
// ---cut---
import { prerender } from '$app/server';
import * as db from '$lib/server/database';

export const getPosts = prerender(async () => {
	const posts = await db.sql`
		SELECT title, slug
		FROM post
		ORDER BY published_at
		DESC
	`;

	return posts;
});
```

You can use `prerender` functions on pages that are otherwise dynamic, allowing for partial prerendering of your data. This results in very fast navigation, since prerendered data can live on a CDN along with your other static assets.

In the browser, prerendered data is saved using the [`Cache`](https://developer.mozilla.org/en-US/docs/Web/API/Cache) API. This cache survives page reloads, and will be cleared when the user first visits a new deployment of your app.

> [!NOTE] When the entire page has `export const prerender = true`, you cannot use queries, as they are dynamic.

### Prerender arguments

As with queries, prerender functions can accept an argument, which should be [validated](#query-Query-arguments) with a [Standard Schema](https://standardschema.dev/):

```js
/// file: src/routes/blog/data.remote.js
// @filename: ambient.d.ts
declare module '$lib/server/database' {
	export function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]>;
}
// @filename: index.js
// ---cut---
import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { prerender } from '$app/server';
import * as db from '$lib/server/database';

export const getPosts = prerender(async () => { /* ... */ });

export const getPost = prerender(v.string(), async (slug) => {
	const [post] = await db.sql`
		SELECT * FROM post
		WHERE slug = ${slug}
	`;

	if (!post) error(404, 'Not found');
	return post;
});
```

Any calls to `getPost(...)` found by SvelteKit's crawler while [prerendering pages](page-options#prerender) will be saved automatically, but you can also specify which values it should be called with using the `inputs` option:

```js
/// file: src/routes/blog/data.remote.js
import * as v from 'valibot';
import { prerender } from '$app/server';
// ---cut---

export const getPost = prerender(
	v.string(),
	async (slug) => { /* ... */ },
	{
		inputs: () => [
			'first-post',
			'second-post',
			'third-post'
		]
	}
);
```

> [!NOTE] Svelte does not yet support asynchronous server-side rendering, so it's likely that you're only calling remote functions from the browser, rather than during prerendering. Because of this, you will need to use `inputs`, for now. We're actively working on this roadblock.

By default, prerender functions are excluded from your server bundle, which means that you cannot call them with any arguments that were _not_ prerendered. You can set `dynamic: true` to change this behaviour:

```js
/// file: src/routes/blog/data.remote.js
import * as v from 'valibot';
import { prerender } from '$app/server';
// ---cut---

export const getPost = prerender(
	v.string(),
	async (slug) => { /* ... */ },
	{
		+++dynamic: true+++,
		inputs: () => [
			'first-post',
			'second-post',
			'third-post'
		]
	}
);
```

## Handling validation errors

As long as _you're_ not passing invalid data to your remote functions, there are only two reasons why the argument passed to a `command`, `query` or `prerender` function would fail validation:

- the function signature changed between deployments, and some users are currently on an older version of your app
- someone is trying to attack your site by poking your exposed endpoints with bad data

In the second case, we don't want to give the attacker any help, so SvelteKit will generate a generic [400 Bad Request](https://http.dog/400) response. You can control the message by implementing the [`handleValidationError`](hooks#Server-hooks-handleValidationError) server hook, which, like [`handleError`](hooks#Shared-hooks-handleError), must return an [`App.Error`](errors#Type-safety) (which defaults to `{ message: string }`):

```js
/// file: src/hooks.server.ts
/** @type {import('@sveltejs/kit').HandleValidationError} */
export function handleValidationError({ event, issues }) {
	return {
		message: 'Nice try, hacker!'
	};
}
```

If you know what you're doing and want to opt out of validation, you can pass the string `'unchecked'` in place of a schema:

```ts
/// file: data.remote.ts
import { query } from '$app/server';

export const getStuff = query('unchecked', async ({ id }: { id: string }) => {
	// the shape might not actually be what TypeScript thinks
	// since bad actors might call this function with other arguments
});
```

> [!NOTE] `form` does not accept a schema since you are always passed a `FormData` object. You are free to parse and validate this as you see fit.

## Using `getRequestEvent`

Inside `query`, `form` and `command` you can use [`getRequestEvent`](https://svelte.dev/docs/kit/$app-server#getRequestEvent) to get the current [`RequestEvent`](@sveltejs-kit#RequestEvent) object. This makes it easy to build abstractions for interacting with cookies, for example:

```ts
/// file: user.remote.ts
import { getRequestEvent, query } from '$app/server';
import { findUser } from '$lib/server/database';

export const getProfile = query(async () => {
	const user = await getUser();

	return {
		name: user.name,
		avatar: user.avatar
	};
});

// this function could be called from multiple places
function getUser() {
	const { cookies, locals } = getRequestEvent();

	locals.userPromise ??= findUser(cookies.get('session_id'));
	return await locals.userPromise;
}
```

Note that some properties of `RequestEvent` are different inside remote functions. There are no `params` or `route.id`, and you cannot set headers (other than writing cookies, and then only inside `form` and `command` functions), and `url.pathname` is always `/` (since the path that’s actually being requested by the client is purely an implementation detail).

## Redirects

Inside `query`, `form` and `prerender` functions it is possible to use the [`redirect(...)`](https://svelte.dev/docs/kit/@sveltejs-kit#redirect) function. It is *not* possible inside `command` functions, as you should avoid redirecting here. (If you absolutely have to, you can return a `{ redirect: location }` object and deal with it in the client.)
