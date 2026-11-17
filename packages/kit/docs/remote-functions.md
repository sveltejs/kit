# Remote functions

Remote functions provide typed calls from client code to functions that run on
the server. They are exported from a remote module, such as
`src/routes/blog/data.remote.js`, and can use server-only modules. SvelteKit
generates the client/server transport for them.

Remote functions are experimental. Enable them and Svelte's async compiler
support in `vite.config.js`:

```js
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			experimental: { remoteFunctions: true },
			compilerOptions: { experimental: { async: true } }
		})
	]
});
```

Import functions from `$app/server`. Use `query` to read dynamic data and
`form` to validate and handle form submissions:

```js
// src/routes/blog/data.remote.js
import * as v from 'valibot';
import { query, form } from '$app/server';
import * as db from '$lib/server/database.js';

export const getPosts = query(async () => db.getPosts());

export const createPost = form(
	v.object({ title: v.pipe(v.string(), v.nonEmpty()) }),
	async ({ title }) => db.createPost(title)
);
```

Await a query in a component, or spread a form function onto a `<form>`:

```svelte
<script>
	import { getPosts, createPost } from './data.remote.js';
</script>

<form {...createPost}>
	<input name="title">
	<button>Create post</button>
</form>

{#each await getPosts() as post (post.id)}
	<p>{post.title}</p>
{/each}
```

The other remote function types are `command` for imperative server calls and
`prerender` for static data. Validate arguments at the server boundary and
return only data that is safe to expose to the client.

See the [full remote functions guide](https://svelte.dev/docs/kit/remote-functions)
for validation, errors, caching, progressive enhancement, and experimental
API details.
