---
title: How do I use `$app` in a library?
---

We generally recommend that you not use SvelteKit-specific code in a library as it would prevent the library from being used in a non-SvelteKit Svelte application. If you'd like to check the `browser` condition, we instead recommend that you define `exports` in `package.json` and use [the `browser` condition](https://nodejs.org/api/packages.html#community-conditions-definitions).
