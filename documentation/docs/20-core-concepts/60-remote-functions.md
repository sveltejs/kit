---
title: Remote functions
---

<blockquote class="since note">
	<p>Available since 2.27</p>
</blockquote>

Remote functions are a tool for type-safe communication between client and server. They can be _called_ anywhere in your app, but always _run_ on the server, and as such can safely access [server-only modules](server-only-modules) containing things like environment variables and database clients.

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

Remote functions are exported from a `.remote.js` or `.remote.ts` file, and come in four flavours: `query`, `form`, `command` and `prerender`. On the client, the exported functions are transformed to `fetch` wrappers that invoke their counterparts on the server via a generated HTTP endpoint.

## query

The `query` function allows you to read dynamic data from the server:

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

	const post = getPost(params.slug);
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
		WHERE slug=${slug}
	`;

	if (!post) error(404, 'Not found');
	return post;
});
```

> [!NOTE] Both the argument and the return value are serialized with [devalue](https://github.com/sveltejs/devalue), which handles types like `Date` and `Map` (and custom types defined in your [transport hook](hooks#Universal-hooks-transport)) in addition to JSON.

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

By default, all queries used on the page (along with any `load` functions) are automatically refreshed following a successful form submission. (Later, in the section on [single-flight mutations](TK), we'll see how to refresh individual queries without a server round-trip.)

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

### formAction

By default, submitting a form will send a request to the URL indicated by the `<form>` element's [`action`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/form#attributes_for_form_submission) attribute, which in the case of a remote function is a property on the form object generated by SvelteKit.

It's possible for a `<button>` inside the `<form>` to send the request to a _different_ URL, using the [`formaction`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button#formaction) attribute. For example, you might have a single form that allows you to login or register depending on which button was clicked.

This attribute exists on the `formAction` property of a form object:

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
	<button {...register.formAction}>register</button>
</form>
```

The `formAction` property mirrors the form object itself, and has an `enhance` method for customizing submission behaviour.

## command

For cases where serving no-JS users via the remote `form` function is impractical or undesirable, `command` offers an alternative way to write data to the server.

```ts
/// file: likes.remote.ts
import z from 'zod';
import { query, command } from '$app/server';
import * as db from '$lib/server/db';

export const getLikes = query(z.string(), async (id) => {
	const [row] = await sql`select likes from item where id = ${id}`;
	return row.likes;
});

export const addLike = command(z.string(), async (id) => {
	await sql`
		update item
		set likes = likes + 1
		where id = ${id}
	`;

	getLikes(id).refresh();

	// we can return arbitrary data from a command
	return { success: true };
});
```

Now simply call `addLike`, from (for example) an event handler:

```svelte
<!--- file: +page.svelte --->
<script>
	import { getLikes, addLike } from './likes.remote';

	let { item } = $props();
</script>

<button
	onclick={async () => {
		try {
			await addLike();
		} catch (error) {
			showToast(error.message);
		}
	}}
>
	add like
</button>

<p>likes: {await getLikes(item.id)}</p>
```

> [!NOTE] Commands cannot be called during render.

As with forms, we can refresh associated queries on the server during the command or via `.updates(...)` on the client for a single-flight mutation, otherwise all queries will automatically be refreshed.

## prerender

This function is like `query` except that it will be invoked at build time to prerender the result. Use this for data that changes at most once per redeployment.

```ts
/// file: blog.remote.ts
import z from 'zod';
import { prerender } from '$app/server';

export const getBlogPost = prerender(z.string(), (slug) => {
	// ...
});
```

You can use `prerender` functions on pages that are otherwise dynamic, allowing for partial prerendering of your data. This results in very fast navigation, since prerendered data can live on a CDN along with your other static assets, and will be put into the user's browser cache using the [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) which even survives page reloads.

> [!NOTE] When the entire page has `export const prerender = true`, you cannot use queries, as they are dynamic.

Prerendering is automatic, driven by SvelteKit's crawler, but you can also provide an `entries` option to control what gets prerendered, in case some pages cannot be reached by the crawler:

```ts
/// file: blog.remote.ts
import z from 'zod';
import { prerender } from '$app/server';

export const getBlogPost = prerender(
	z.string(),
	(slug) => {
		// ...
	},
	{
		entries: () => ['first-post', 'second-post', 'third-post']
	}
);
```

If the function is called at runtime with arguments that were not prerendered it will error by default, as the code will not have been included in the server bundle. You can set `dynamic: true` to change this behaviour:

```ts
/// file: blog.remote.ts
import z from 'zod';
import { prerender } from '$app/server';

export const getBlogPost = prerender(
	z.string(),
	(slug) => {
		// ...
	},
	{
		+++dynamic: true,+++
		entries: () => ['first-post', 'second-post', 'third-post']
	}
);
```

## Optimistic updates

Queries have an `withOverride` method, which is useful for optimistic updates. It receives a function that transforms the query, and must be passed to `submit().updates(...)` or `myCommand.updates(...)`:

```svelte
<!--- file: +page.svelte --->
<script>
	import { getLikes, addLike } from './likes.remote';

	let { item } = $props();
</script>

<button
	onclick={async () => {
		try {
			---await addLike();---
			+++await addLike().updates(getLikes(item.id).withOverride((n) => n + 1));+++
		} catch (error) {
			showToast(error.message);
		}
	}}
>
	add like
</button>

<p>likes: {await getLikes(item.id)}</p>
```

> [!NOTE] You can also do `const likes = $derived(getLikes(item.id))` in your `<script>` and then do `likes.withOverride(...)` and `{await likes}` if you prefer, but since `getLikes(item.id)` returns the same object in both cases, this is optional

Multiple overrides can be applied simultaneously — if you click the button multiple times, the number of likes will increment accordingly. If `addLike()` fails, the override releases and will decrement it again, otherwise the updated data (sans override) will match the optimistic update.

## Validation

Data validation is an important part of remote functions. They look like regular JavaScript functions but they are actually auto-generated public endpoints. For that reason we strongly encourage you to validate the input using a [Standard Schema](https://standardschema.dev/) object, which you create for example through `Zod`:

```ts
/// file: data.remote.ts
import { query } from '$app/server';
import { z } from 'zod';

const schema = z.object({
	id: z.string()
});

export const getStuff = query(schema, async ({ id }) => {
	// `id` is typed correctly. if the function
	// was called with bad arguments, it will
	// result in a 400 Bad Request response
});
```

By default a failed schema validation will result in a generic `400` response with just the text `Bad Request`. You can adjust the returned shape by implementing the `handleValidationError` hook in `hooks.server.js`. The returned shape must adhere to the shape of `App.Error`.

```js
/// file: src/hooks.server.ts
import z from 'zod';

/** @type {import('@sveltejs/kit').HandleValidationError} */
export function handleValidationError({ issues }) {
	return { validationErrors: z.prettifyError({ issues })}
}
```

If you wish to opt out of validation (for example because you validate through other means, or just know this isn't a problem), you can do so by passing `'unchecked'` as the first argument instead:

```ts
/// file: data.remote.ts
import { query } from '$app/server';

export const getStuff = query('unchecked', async ({ id }: { id: string }) => {
	// the shape might not actually be what TypeScript thinks
	// since bad actors might call this function with other arguments
});
```

In case your `query` does not accept arguments you don't need to pass a schema or `'unchecked'` - validation is added under the hood on your behalf to check that no arguments are passed to this function:

```ts
/// file: data.remote.ts
import { query } from '$app/server';

export const getStuff = query(() => {
	// ...
});
```

The same applies to `prerender` and `command`. `form` does not accept a schema since you are always passed a `FormData` object which you need to parse and validate yourself.

## Accessing the current request event

SvelteKit exposes a function called [`getRequestEvent`](https://svelte.dev/docs/kit/$app-server#getRequestEvent) which allows you to get details of the current request inside hooks, `load`, actions, server endpoints, and the functions they call.

This function can now also be used in `query`, `form` and `command`, allowing us to do things like reading and writing cookies:

```ts
/// file: user.remote.ts
import { getRequestEvent, query } from '$app/server';
import { findUser } from '$lib/server/db';

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

Note that some properties of `RequestEvent` are different in remote functions. There are no `params` or `route.id`, and you cannot set headers (other than writing cookies, and then only inside `form` and `command` functions), and `url.pathname` is always `/` (since the path that’s actually being requested by the client is purely an implementation detail).

## Redirects

Inside `query`, `form` and `prerender` functions it is possible to use the [`redirect(...)`](https://svelte.dev/docs/kit/@sveltejs-kit#redirect) function. It is *not* possible inside `command` functions, as you should avoid redirecting here. (If you absolutely have to, you can return a `{ redirect: location }` object and deal with it in the client.)
