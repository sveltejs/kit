---
'@sveltejs/kit': minor
---

feat: add `query.fanOut`, a fan-out variant of `query` that turns one server call into an array of per-item query resources alongside list-level metadata

`query.fanOut(item_query, schema?, fn)` accepts a companion single-item `query` function, an optional validator, and a function that returns `{ rows: Array<[ItemArg, Item]>, ...meta }`. Awaiting the result resolves to `{ rows: Array<{ query: RemoteQuery<Item>, key: string }>, ...meta }` — each row carries a `query` that shares identity with a direct `item_query(arg)` call and a stable `key` suitable for use in a Svelte `#each (row.key)` block. List-level fields (cursors, totals, has-next-page, etc.) pass through unchanged.

Subsequent calls to the item query elsewhere on the page hit the warm cache, and per-row `set()` / `refresh()` granularly invalidate only the affected row.

```js
// products.remote.js
import { query } from '$app/server';

export const get_product = query('unchecked', (id) => db.products.get(id));

export const get_products = query.fanOut(get_product, 'unchecked', ({ cursor }) => {
	const { products, end_cursor, has_next_page } = db.products.list({ cursor });
	return {
		rows: products.map((p) => [p.id, p]),
		end_cursor,
		has_next_page
	};
});
```

```svelte
<!-- +page.svelte -->
{#await get_products({ cursor }) then page}
	{#each page.rows as row (row.key)}
		{#await row.query then product}
			<ProductCard {product} />
		{/await}
	{/each}
	{#if page.has_next_page}
		<button onclick={() => (cursor = page.end_cursor)}>Load more</button>
	{/if}
{/await}
```
