---
title: Migration to SvelteKit v2
---

Upgrading from SvelteKit version 1 to version 2 should be mostly seamless. There are a few breaking changes to note, which are listed here. You can use `npx svelte-migrate sveltekit-2` to migrate some of these changes automatically.

We highly recommend upgrading to the most recent 1.x version before upgrading to 2.0, so that you can take advantage of targeted deprecation warnings.

## `redirect` and `error` are no longer thrown by you

Previously, you had to `throw` the values returned from `error(...)` and `redirect(...)` yourself. In SvelteKit 2 this is no longer the case — calling the functions is sufficient.

```diff
import { error } from '@sveltejs/kit'

...
- throw error(500, 'something went wrong');
+ error(500, 'something went wrong');
```

`svelte-migrate` will do these changes automatically for you.

If the error or redirect is thrown inside a `try {...}` block (hint: don't do this!), you can distinguish them from unexpected errors using [`isHttpError`](/docs/modules#sveltejs-kit-ishttperror) and [`isRedirect`](/docs/modules#sveltejs-kit-isredirect) imported from `@sveltejs/kit`.

## Top-level promises are no longer awaited

In SvelteKit version 1, if the top-level properties of the object returned from a `load` function were promises, they were automatically awaited. With the introduction of [streaming](https://svelte.dev/blog/streaming-snapshots-sveltekit) this behavior became a bit awkward as it forces you to nest your streamed data one level deep.

As of version 2, SvelteKit no longer differentiates between top-level and non-top-level promises. To get back the blocking behavior, use `await` (with `Promise.all` to prevent waterfalls, where appropriate):

```diff
// If you have a single promise
export function load({ fetch }) {
-    const response = fetch(...).then(r => r.json());
+    const response = await fetch(...).then(r => r.json());
    return { response }
}
```

```diff
// If you have multiple promises
export function load({ fetch }) {
-    const a = fetch(...).then(r => r.json());
-    const b = fetch(...).then(r => r.json());
+    const [a, b] = Promise.all([
+      fetch(...).then(r => r.json()),
+      fetch(...).then(r => r.json()),
+    ]);
    return { a, b };
}
```

## goto(...) no longer accepts external URLs

To navigate to an external URL, use `window.location = url`.

## paths are now relative by default

In SvelteKit 1, `%sveltekit.assets%` in your `app.html` was replaced with a relative path by default (i.e. `.` or `..` or `../..` etc, depending on the path being rendered) during server-side rendering unless the [`paths.relative`](/docs/configuration#paths) config option was explicitly set to `false`. The same was true for `base` and `assets` imported from `$app/paths`, but only if the `paths.relative` option was explicitly set to `true`.

This inconsistency is fixed in version 2. Paths are either always relative or always absolute, depending on the value of [`paths.relative`](/docs/configuration#paths). It defaults to `true` as this results in more portable apps: if the `base` is something other than the app expected (as is the case when viewed on the [Internet Archive](https://archive.org/), for example) or unknown at build time (as is the case when deploying to [IPFS](https://ipfs.tech/) and so on), fewer things are likely to break.

## Server fetches are not trackable anymore

Previously it was possible to track URLs from `fetch`es on the server in order to rerun load functions. This poses a possible security risk (private URLs leaking), and as such it was behind the `dangerZone.trackServerFetches` setting, which is now removed.

## Updated dependency requirements

SvelteKit requires Node `18.13` or higher, Vite `^5.0`, vite-plugin-svelte `^3.0`, TypeScript `^5.0` and Svelte version 4 or higher. `svelte-migrate` will do the `package.json` bumps for you.

As part of the TypeScript dependency bump, the generated `tsconfig.json` (the one your `tsconfig.json` extends from), it changed the `moduleResolution` to `bundler` (the new recommended default by the TypeScript team, which properly resolves types from packages using the now common exports map feature) and using `verbatimModuleSyntax` which replaces the existing `importsNotUsedAsValues ` and `preserveValueImports` flags (if you have those in your `tsconfig.json`, remove them - `svelte-migrate` will do this for you).
