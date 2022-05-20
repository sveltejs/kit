---
title: Types
---

**TYPES**

### Generated types

The `RequestHandler` and `Load` types both accept a `Params` argument allowing you to type the `params` object. For example this endpoint expects `foo`, `bar` and `baz` params:

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
/// file: .svelte-kit/types/src/routes/[foo]/[bar]/__types/[baz].d.ts
/// link: false
import type { RequestHandler as GenericRequestHandler, Load as GenericLoad } from '@sveltejs/kit';

export type RequestHandler<Body = any> = GenericRequestHandler<
	{ foo: string; bar: string; baz: string },
	Body
>;

export type Load<
	InputProps extends Record<string, any> = Record<string, any>,
	OutputProps extends Record<string, any> = InputProps
> = GenericLoad<{ foo: string; bar: string; baz: string }, InputProps, OutputProps>;
```

These files can be imported into your endpoints and pages as siblings, thanks to the [`rootDirs`](https://www.typescriptlang.org/tsconfig#rootDirs) option in your TypeScript configuration:

```js
/// file: src/routes/[foo]/[bar]/[baz].js
// @filename: __types/[baz].d.ts
import type { RequestHandler as GenericRequestHandler, Load as GenericLoad } from '@sveltejs/kit';

export type RequestHandler<Body = any> = GenericRequestHandler<
	{ foo: string, bar: string, baz: string },
	Body
>;

// @filename: index.js
// @errors: 2355
// ---cut---
/** @type {import('./__types/[baz]').RequestHandler} */
export async function get({ params }) {
	// ...
}
```

```svelte
<script context="module">
	/** @type {import('./__types/[baz]').Load} */
	export async function load({ params, fetch, session, stuff }) {
		// ...
	}
</script>
```

> For this to work, your own `tsconfig.json` or `jsconfig.json` should extend from the generated `.svelte-kit/tsconfig.json` (where `.svelte-kit` is your [`outDir`](/docs/configuration#outdir)):
>
>     { "extends": "./.svelte-kit/tsconfig.json" }

#### Default tsconfig.json

The generated `.svelte-kit/tsconfig.json` file contains a mixture of options. Some are generated programmatically based on your project configuration, and should generally not be overridden without good reason:

```json
/// file: .svelte-kit/tsconfig.json
{
	"compilerOptions": {
		"baseUrl": "..",
		"paths": {
			"$lib": "src/lib",
			"$lib/*": "src/lib/*"
		},
		"rootDirs": ["..", "./types"]
	},
	"include": ["../src/**/*.js", "../src/**/*.ts", "../src/**/*.svelte"],
	"exclude": ["../node_modules/**", "./**"]
}
```

Others are required for SvelteKit to work properly, and should also be left untouched unless you know what you're doing:

```json
/// file: .svelte-kit/tsconfig.json
{
	"compilerOptions": {
		// this ensures that types are explicitly
		// imported with `import type`, which is
		// necessary as svelte-preprocess cannot
		// otherwise compile components correctly
		"importsNotUsedAsValues": "error",

		// Vite compiles one TypeScript module
		// at a time, rather than compiling
		// the entire module graph
		"isolatedModules": true,

		// TypeScript cannot 'see' when you
		// use an imported value in your
		// markup, so we need this
		"preserveValueImports": true,

		// This ensures both `svelte-kit build`
		// and `svelte-kit package` work correctly
		"lib": ["esnext", "DOM"],
		"moduleResolution": "node",
		"module": "esnext",
		"target": "esnext"
	}
}
```
