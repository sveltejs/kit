---
title: Types
---

## Generated types

The `RequestHandler` and `Load` types both accept a `Params` argument allowing you to type the `params` object. For example this endpoint expects `foo`, `bar` and `baz` params:

```js
/// file: src/routes/[foo]/[bar]/[baz]/+server.js
// @errors: 2355 2322 1360
/**
 * @type {import('@sveltejs/kit').RequestHandler<{
 *   foo: string;
 *   bar: string;
 *   baz: string
 * }>}
 */
export async function GET({ params }) {
	// ...
}
```

Needless to say, this is cumbersome to write out, and less portable (if you were to rename the `[foo]` directory to `[qux]`, the type would no longer reflect reality).

To solve this problem, SvelteKit generates `.d.ts` files for each of your endpoints and pages:

```ts
/// file: .svelte-kit/types/src/routes/[foo]/[bar]/[baz]/$types.d.ts
/// link: true
import type * as Kit from '@sveltejs/kit';

type RouteParams = {
	foo: string;
	bar: string;
	baz: string;
};

export type RequestHandler = Kit.RequestHandler<RouteParams>;
export type PageLoad = Kit.Load<RouteParams>;
```

These files can be imported into your endpoints and pages as siblings, thanks to the [`rootDirs`](https://www.typescriptlang.org/tsconfig#rootDirs) option in your TypeScript configuration:

```js
/// file: src/routes/[foo]/[bar]/[baz]/+server.js
// @filename: $types.d.ts
import type * as Kit from '@sveltejs/kit';

type RouteParams = {
	foo: string;
	bar: string;
	baz: string;
}

export type RequestHandler = Kit.RequestHandler<RouteParams>;

// @filename: index.js
// @errors: 2355 2322
// ---cut---
/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
	// ...
}
```

```js
/// file: src/routes/[foo]/[bar]/[baz]/+page.js
// @filename: $types.d.ts
import type * as Kit from '@sveltejs/kit';

type RouteParams = {
	foo: string;
	bar: string;
	baz: string;
}

export type PageLoad = Kit.Load<RouteParams>;

// @filename: index.js
// @errors: 2355
// ---cut---
/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	// ...
}
```

The return types of the load functions are then available through the `$types` module as `PageData` and `LayoutData` respectively, while the union of the return values of all `Actions` is available as `ActionData`.

Starting with version 2.16.0, two additional helper types are provided: `PageProps` defines `data: PageData`, as well as `form: ActionData`, when there are actions defined, while `LayoutProps` defines `data: LayoutData`, as well as `children: Snippet`.

```svelte
<!--- file: src/routes/+page.svelte --->
<script>
	/** @type {import('./$types').PageProps} */
	let { data, form } = $props();
</script>
```

> [!LEGACY]
> Before 2.16.0:
> ```svelte
> <!--- file: src/routes/+page.svelte --->
> <script>
> 	/** @type {{ data: import('./$types').PageData, form: import('./$types').ActionData }} */
> 	let { data, form } = $props();
> </script>
> ```
>
> Using Svelte 4:
> ```svelte
> <!--- file: src/routes/+page.svelte --->
> <script>
>   /** @type {import('./$types').PageData} */
>   export let data;
>   /** @type {import('./$types').ActionData} */
>   export let form;
> </script>
> ```

> [!NOTE] For this to work, your own `tsconfig.json` or `jsconfig.json` should extend from the generated `$app/types`:
>
> `{ "extends": "$app/tsconfig" }`

## app.d.ts

The `app.d.ts` file is home to the ambient types of your apps, i.e. types that are available without explicitly importing them.

Always part of this file is the `App` namespace. This namespace contains several types that influence the shape of certain SvelteKit features you interact with.

> TYPES: App
