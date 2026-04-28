---
'@sveltejs/kit': patch
---

fix: don't apply `paths.base` to Vite config when running under Vitest

When `kit.paths.base` was set to a prefix of the project's filesystem path (e.g. `/Users`), Vite would strip that prefix from the URLs vite-node uses to fetch modules over HTTP, causing `ERR_MODULE_NOT_FOUND` failures. Under Vitest, `base` is now forced to `/` so module resolution works regardless of the configured base path.
