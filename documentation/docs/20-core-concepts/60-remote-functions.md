---
title: Remote Functions
---

Remote functions are a new concept in SvelteKit since version 2.27 that allow you to declare functions inside a `.remote.ts` file, import them inside Svelte components and call them like regular functions. On the server they work like regular functions (and can access environment variables and database clients and so on), while on the client they become wrappers around `fetch`. Combined with Svelte's [experimental async feature](/docs/svelte/await-expressions) it allows you to load and manipulate date directly inside your components. If you're familiar with RPC and 'server functions', this is basically our take on the concept.

This feature is currently experimental, and you must opt in by adding the `kit.experimental.remoteFunctions` option in your `svelte.config.js`:

```js
/// file: svelte.config.js
export default {
	kit: {
		experimental: {
			remoteFunctions: true
		}
    }
};
```

## Overview

Remote functions are declared inside a `.remote.ts` file. You can import them inside Svelte components and call them like regular async functions. On the server you import them directly; on the client, the module is transformed into a collection of functions that request data from the server. 

As of now there exist four types of remote function: `query`, `form`, `command` and `prerender`.

## query

Queries are for reading dynamic data from the server. They can have zero or one arguments. If they have an argument, you're encouraged to validate the input via a schema which you can create with libraries like `Zod` (more details in the upcoming [Validation](#Validation) section). The argument is serialized with [devalue](https://github.com/rich-harris/devalue), which handles types like `Date` and `Map` in addition to JSON, and takes the [transport hook](https://svelte.dev/docs/kit/hooks#Universal-hooks-transport) into account.

```ts
/// file: likes.remote.ts
import z from 'zod';
import { query } from '$app/server';
import * as db from '$lib/server/db';

export const getLikes = query(z.string(), async (id) => {
  const [row] = await db.sql`select likes from item where id = ${id}`;
  return row.likes;
});
```

When called during server-rendering, the result is serialized into the HTML payload so that the data isn't requested again during hydration.

```svelte
<!--- file: +page.svelte --->
<script>
  import { getLikes } from './likes.remote';
  
  let { item } = $props();
</script>

<p>likes: {await getLikes(item.id)}</p>
```

> Async SSR isn’t yet implemented in Svelte, which means this will only load in the client for now. Once SSR is supported, this will be able to hydrate correctly, not refetching data

Queries are *thenable*, meaning they can be awaited. But they're not just promises, they also provide properties like `status` and `current` (which contains the most recent value, but is initially `undefined`) and methods like `withOverride(...)` (see the section on [optimistic UI](#Optimistic-updates), below) and `refresh()`, which fetches new data from the server. We’ll see an example of that in a moment.

Query objects are cached in memory for as long as they are actively used, using the serialized arguments as a key — in other words `myQuery(id) === myQuery(id)`. Refreshing or overriding a query will update every occurrence of it on the page. We use Svelte's reactivity system to intelligently clear the cache to avoid memory leaks.

## form

Forms are the preferred way to write data to the server. Use the remote `form` function to achieve this:

```ts
/// file: likes.remote.ts
import z from 'zod';
import { query, form } from '$app/server';
import * as db from '$lib/server/db';

export const getLikes = query(z.string(), async (id) => {/*...*/});

export const addLike = form(async (data: FormData) => {
  const id = data.get('id') as string;

  await sql`
    update item
    set likes = likes + 1
    where id = ${id}
  `;

  // we can return arbitrary data from a form function
  return { success: true };
});
```

A form object such as `addLike` has enumerable properties — `method`, `action` and `onsubmit` — that can be spread onto a `<form>` element. This allows the form to work without JavaScript (i.e. it submits data and reloads the page), but it will also automatically progressively enhance the form, submitting data *without* reloading the entire page.

```svelte
<!--- file: +page.svelte --->
<script>
  import { getLikes, addLike } from './likes.remote';
  
  let { item } = $props();
</script>

<form {...addLike}>
  <input type="hidden" name="id" value={item.id} />
  <button>add like</button>
</form>

<p>likes: {await getLikes(item.id)}</p>
```

By default, all queries used on the page (along with any `load` functions) are automatically refreshed following a form submission, meaning `getLikes(...)` in the example above will show updated data.

In addition to the enumerable properties, remote forms (`addLike` in our example) have non-enumerable properties such as `result`, containing the return value, and `enhance` which allows us to customize how the form is progressively enhanced. We can use this to indicate that *only* `getLikes(...)` should be refreshed and through that also enable *single-flight mutations*  — meaning that the updated data for `getLikes(...)` is sent back from the server along with the form result. Additionally we provide nicer behaviour in the case that the submission fails (by default, an error page will be shown): 

```svelte
<!--- file: +page.svelte --->
<script>
  import { getLikes, addLike } from './likes.remote';
  
  let { item } = $props();
</script>

{#if addLike.result?.success}
  <p>success!</p>
{/if}

<form {...addLike.enhance(async ({ submit }) => {
  try {
    // by passing queries to `.updates(...)` we will prevent a global refresh and the
    // refreshed data is sent together with the submission response (single flight mutation)
    await submit().updates(getLikes(item.id));
  } catch (error) {
    // instead of showing an error page,
    // present a demure notification
    showToast(error.message);
  }
}}>
  <input type="hidden" name="id" value={item.id} />
  <button>add like</button>
</form>

<p>likes: {await getLikes(item.id)}</p>
```

> `form.result` need not indicate success — it can also contain validation errors along with any data that should repopulate the form on page reload, [much as happens today with form actions](form-actions).

Alternatively we can also enable single-flight mutations by adding the `refresh` call to the server, which means _all_ calls to `addLike` will leverage single-flight mutations compared to only those who use `submit.updates(...)`:

```ts
/// file: likes.remote.ts
import { query, form } from '$app/server';
import * as db from '$lib/server/db';

export const getLikes = query(async (id: string) => {
  const [row] = await sql`select likes from item where id = ${id}`;
  return row.likes;
});

export const addLike = form(async (data: FormData) => {
  const id = data.get('id') as string;

  await sql`
    update item
    set likes = likes + 1
    where id = ${id}
  `;

+++ await getLikes(id).refresh();+++

  // we can return arbitrary data from a form function
  return { success: true };
});
```

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

> Commands cannot be called during render.

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

> When the entire page has `export const prerender = true`, you cannot use queries, as they are dynamic.

Prerendering is automatic, driven by SvelteKit's crawler, but  you can also provide an `entries` option to control what gets prerendered, in case some pages cannot be reached by the crawler:

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
+++   dynamic: true,+++
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
---      await addLike();---
+++      await addLike().updates(getLikes(item.id).withOverride((n) => n + 1));+++
    } catch (error) {
      showToast(error.message);
    }
  }}
>
  add like
</button>

<p>likes: {await getLikes(item.id)}</p>
```

> You can also do `const likes = $derived(getLikes(item.id))` in your `<script>` and then do `likes.withOverride(...)` and `{await likes}` if you prefer, but since `getLikes(item.id)` returns the same object in both cases, this is optional

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

```ts
/// file: src/hooks.server.ts
import z from 'zod';

export function handleValidationError({ issues }) {
  return { validationErrors: z.treeifyError({ isses })}
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
