---
'@sveltejs/kit': minor
---

feat: queries can return query instances, and `RemoteQuery.set()` is now chainable

A `query()` function (or `query.batch()`) can now return a `RemoteQuery` instance — or arbitrarily nested structures containing them. Each nested query is awaited, inlined into the response, and rehydrated on the client as a `QueryProxy` whose cache identity matches a direct call to that query. This means a subsequent direct call to the inner query elsewhere on the page hits the warm cache without an extra fetch, and per-row `set()` / `refresh()` granularly invalidate just the affected row.

`RemoteQuery.set(value)` now returns the query instance instead of `void`, so you can construct a pre-populated query in one expression: `my_query(arg).set(data)`. When called from inside another query's user function, `.set()` populates the per-request cache (no command/form context required); when called inside a `command`/`form` body, it continues to ride back via single-flight as before.

```js
// products.remote.js
import { query } from '$app/server';

export const get_product = query('unchecked', (id) => db.products.get(id));

export const get_products = query('unchecked', async ({ cursor }) => {
	const { products, end_cursor, has_next_page } = await db.products.list({ cursor });
	return {
		end_cursor,
		has_next_page,
		rows: products.map((p) => ({ key: p.id, query: get_product(p.id).set(p) }))
	};
});
```

```svelte
<!-- +page.svelte -->
{#await get_products({ cursor }) then page}
	{#each page.rows as { key, query } (key)}
		{#await query then product}
			<ProductCard {product} />
		{/await}
	{/each}
	{#if page.has_next_page}
		<button onclick={() => (cursor = page.end_cursor)}>Load more</button>
	{/if}
{/await}
```
