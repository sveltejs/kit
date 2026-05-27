---
'@sveltejs/kit': minor
---

feat: add `query.fanOut`, a fan-out variant of `query` that turns one server call into an array of per-item query resources

`query.fanOut(item_query, schema?, fn)` accepts a companion single-item `query` function, a (optional) validator, and a function that returns `Array<[ItemArg, Item]>` tuples. Awaiting the result resolves to an array of `RemoteQuery<Item>` instances — one per row — each sharing identity with a direct `item_query(arg)` call. This means a subsequent call to the item query elsewhere on the page hits the warm cache, and per-row `set()` / `refresh()` granularly invalidates only the affected row.

```js
// products.remote.js
import { query } from '$app/server';

export const get_product = query('unchecked', (id) => db.products.get(id));

export const get_products = query.fanOut(get_product, 'unchecked', ({ cursor }) => {
	const products = db.products.list({ cursor });
	return products.map((product) => [product.id, product]);
});
```

```svelte
<!-- +page.svelte -->
{#await get_products({ cursor }) then rows}
	{#each rows as row (row)}
		{#await row then product}
			<ProductCard {product} />
		{/await}
	{/each}
{/await}
```
