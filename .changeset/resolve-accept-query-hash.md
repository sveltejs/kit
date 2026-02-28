---
'@sveltejs/kit': patch
---

feat: allow `resolve()` to accept pathnames with query strings and hash fragments

Adds a `ResolvablePath` type that extends `Pathname` to also accept `?${string}` and `#${string}` suffixes. This allows usage like `goto(resolve('/map?x=1'))` which satisfies both the type checker and the `svelte/no-navigation-without-resolve` lint rule.
