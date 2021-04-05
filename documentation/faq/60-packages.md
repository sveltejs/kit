---
question: How do I fix the error I'm getting trying to include a package?
---

Most of these issues come from Vite trying to deal with non-ESM libraries. You may find helpful examples in [the Vite issue tracker](https://github.com/vitejs/vite/issues). The most common solutions would be to try moving the package between `dependencies` and `devDependencies` or trying to `include` or `exclude` it in `optimizeDeps`. Packages which use `exports` instead of `module.exports` are currently failing due to a [known Vite issue](https://github.com/vitejs/vite/issues/2579).

You should also consider asking the library author to distribute an ESM version of their package or even converting the source for the package entirely to ESM.
