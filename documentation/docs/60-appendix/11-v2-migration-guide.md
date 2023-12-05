---
title: Migration to SvelteKit v2
---

Bumping from SvelteKit version 1 to version 2 should be mostly seamless. There are a few breaking changes to note, which are listed here. You can use `npx svelte-migrate sveltekit-2` to migrate some of these changes automatically.

## `redirect` and `error` are no longer thrown by you

Previously, you had to `throw` the `error` and `redirect` methods yourself. In SvelteKit 2, these methods themselves throw, so you no longer need to do it yourself.

```diff
import { error } from '@sveltejs/kit'

...
- throw error(500, 'something went wrong');
+ error(500, 'something went wrong');
```

`svelte-migrate` will do these changes automatically for you.

## Top-level promises are no longer awaited

In SvelteKit version 1, promises returned from the top level of a `load` function are automatically awaited. Very few people actually took advantage of this, and with the introduction of [streaming load functions](https://svelte.dev/blog/streaming-snapshots-sveltekit) this behavior became a bit awkward as it forces you to nest your streamed data one level deep. Therefore, SvelteKit no longer awaits top level promises returned from a `load` function and instead streams these, too. To get back the blocking behavior, wrap your top level promises with `Promise.all(...)`, or if you only have one promise, `await` it.

```diff
export function load({ fetch }) {
    const response1 = fetch(...).then(r => r.json());
    const response2 = fetch(...).then(r => r.json());
-    return { response1, response2 }
+    return Promise.all({ response1, response2 })
}

// Or if you only have a single promise
export function load({ fetch }) {
-    const response = fetch(...).then(r => r.json());
+    const response = await fetch(...).then(r => r.json());
    return { response }
}
```

## paths are now relative by default

TODO explain

## Updated dependency requirements

SvelteKit requires Node `18.13` or higher, Vite `^5.0`, vite-plugin-svelte `^3.0`, TypeScript `^5.0` and Svelte version 4 or higher. `svelte-migrate` will do the `package.json` bumps for you.

As part of the TypeScript dependency bump, the generated `tsconfig.json` (the one your `tsconfig.json` extends from), it changed the `moduleResolution` to `bundler` (the new recommended default by the TypeScript team, which properly resolves types from packages using the now common exports map feature) and using `verbatimModuleSyntax` which replaces the existing `importsNotUsedAsValues ` and `preserveValueImports` flags (if you have those in your `tsconfig.json`, remove them - `svelte-migrate` will do this for you). 
