---
title: Types
---

## Generated types

The `RequestHandler` and `Load` types both accept a `Params` argument allowing you to type the `params` object. For example this endpoint expects `foo`, `bar` and `baz` params:

```js
/// file: src/routes/[foo]/[bar]/[baz]/+page.server.js
// @errors: 2355 2322 1360
/** @type {import('@sveltejs/kit').RequestHandler<{
    foo: string;
    bar: string;
    baz: string
  }>} */
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

export type PageServerLoad = Kit.ServerLoad<RouteParams>;
export type PageLoad = Kit.Load<RouteParams>;
```

These files can be imported into your endpoints and pages as siblings, thanks to the [`rootDirs`](https://www.typescriptlang.org/tsconfig#rootDirs) option in your TypeScript configuration:

```js
/// file: src/routes/[foo]/[bar]/[baz]/+page.server.js
// @filename: $types.d.ts
import type * as Kit from '@sveltejs/kit';

type RouteParams = {
	foo: string;
	bar: string;
	baz: string;
}

export type PageServerLoad = Kit.ServerLoad<RouteParams>;

// @filename: index.js
// @errors: 2355
// ---cut---
/** @type {import('./$types').PageServerLoad} */
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

The return types of the load functions are then available through the `$types` module as `PageData` and `LayoutData` respectively, while the union of the return values of all `Actions` is available as `ActionData`. Starting with version 2.16.0, two additional helper types are provided. `PageProps` defines `data: PageData`, as well as `form: ActionData`, when there are actions defined. `LayoutProps` defines `data: LayoutData`, as well as `children: Snippet`:

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

> [!NOTE] For this to work, your own `tsconfig.json` or `jsconfig.json` should extend from the generated `.svelte-kit/tsconfig.json` (where `.svelte-kit` is your [`outDir`](configuration#outDir)):
>
> `{ "extends": "./.svelte-kit/tsconfig.json" }`

### Default tsconfig.json

The generated `.svelte-kit/tsconfig.json` file contains a mixture of options. Some are generated programmatically based on your project configuration, and should generally not be overridden without good reason:

```json
/// file: .svelte-kit/tsconfig.json
{
	"compilerOptions": {
		"paths": {
			"$lib": ["../src/lib"],
			"$lib/*": ["../src/lib/*"]
		},
		"rootDirs": ["..", "./types"]
	},
	"include": [
		"ambient.d.ts",
		"non-ambient.d.ts",
		"./types/**/$types.d.ts",
		"../vite.config.js",
		"../vite.config.ts",
		"../src/**/*.js",
		"../src/**/*.ts",
		"../src/**/*.svelte",
		"../tests/**/*.js",
		"../tests/**/*.ts",
		"../tests/**/*.svelte"
	],
	"exclude": [
		"../node_modules/**",
		"../src/service-worker.js",
		"../src/service-worker/**/*.js",
		"../src/service-worker.ts",
		"../src/service-worker/**/*.ts",
		"../src/service-worker.d.ts",
		"../src/service-worker/**/*.d.ts"
	]
}
```

Others are required for SvelteKit to work properly, and should also be left untouched unless you know what you're doing:

```json
/// file: .svelte-kit/tsconfig.json
{
	"compilerOptions": {
		// this ensures that types are explicitly
		// imported with `import type`, which is
		// necessary as Svelte/Vite cannot
		// otherwise compile components correctly
		"verbatimModuleSyntax": true,

		// Vite compiles one TypeScript module
		// at a time, rather than compiling
		// the entire module graph
		"isolatedModules": true,

		// Tell TS it's used only for type-checking
		"noEmit": true,

		// This ensures both `vite build`
		// and `svelte-package` work correctly
		"lib": ["esnext", "DOM", "DOM.Iterable"],
		"moduleResolution": "bundler",
		"module": "esnext",
		"target": "esnext"
	}
}
```

## $lib

This is a simple alias to `src/lib`, or whatever directory is specified as [`config.kit.files.lib`](configuration#files). It allows you to access common components and utility modules without `../../../../` nonsense.

### $lib/server

A subdirectory of `$lib`. SvelteKit will prevent you from importing any modules in `$lib/server` into client-side code. See [server-only modules](server-only-modules).

## app.d.ts

The `app.d.ts` file is home to the ambient types of your apps, i.e. types that are available without explicitly importing them.

Always part of this file is the `App` namespace. This namespace contains several types that influence the shape of certain SvelteKit features you interact with.

> TYPES: App
