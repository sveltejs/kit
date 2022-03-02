---
title: Types
---

**TYPES**

### Generated types

The [`RequestHandler`](#sveltejs-kit-requesthandler) and [`Load`](#sveltejs-kit-load) types both accept a `Params` argument allowing you to type the `params` object. For example this endpoint expects `foo`, `bar` and `baz` params:

```js
/// file: src/routes/[foo]/[bar]/[baz].js
// @errors: 2355
/** @type {import('@sveltejs/kit').RequestHandler<{
 *   foo: string;
 *   bar: string;
 *   baz: string
 * }>} */
export async function get({ params }) {
	// ...
}
```

Needless to say, this is cumbersome to write out, and less portable (if you were to rename the `[foo]` directory to `[qux]`, the type would no longer reflect reality).

To solve this problem, SvelteKit generates `.d.ts` files for each of your endpoints and pages:

```ts
/// file: .svelte-kit/types/src/routes/[foo]/[bar]/[baz].d.ts
/// link: false
import type { RequestHandler as GenericRequestHandler, Load as GenericLoad } from '@sveltejs/kit';

export type RequestHandler<Body = any> = GenericRequestHandler<
	{ foo: string; bar: string; baz: string },
	Body
>;

export type Load<Props = Record<string, any>> = GenericLoad<
	{ foo: string; bar: string; baz: string },
	Props
>;
```

These files can be imported into your endpoints and pages as siblings, thanks to the [`rootDirs`](https://www.typescriptlang.org/tsconfig#rootDirs) option in your TypeScript configuration:

```js
/// file: src/routes/[foo]/[bar]/[baz].js
// @filename: [baz].d.ts
import type { RequestHandler as GenericRequestHandler, Load as GenericLoad } from '@sveltejs/kit';

export type RequestHandler<Body = any> = GenericRequestHandler<
	{ foo: string, bar: string, baz: string },
	Body
>;

// @filename: index.js
// @errors: 2355
// ---cut---
/** @type {import('./[baz]').RequestHandler} */
export async function get({ params }) {
	// ...
}
```

```svelte
<script context="module">
	/** @type {import('./[baz]').Load} */
	export async function load({ params, fetch, session, stuff }) {
		// ...
	}
</script>
```

> For this to work, your own `tsconfig.json` or `jsconfig.json` should extend from the generated `.svelte-kit/tsconfig.json` (where `.svelte-kit` is your [`outDir`](/docs/configuration#outdir)):
>
>     { "extends": "./.svelte-kit/tsconfig.json" }
