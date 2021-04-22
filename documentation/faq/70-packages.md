---
question: How do I fix the error I'm getting trying to include a package?
---

Most of these issues come from Vite trying to deal with non-ESM libraries. You may find it helpful to search for your error message in [the Vite issue tracker](https://github.com/vitejs/vite/issues).

There are a number of known Vite issues, which cause errors in the following circumstances:

- [CommonJS packages](https://github.com/vitejs/vite/issues/2579).
- [ESM library that imports a CJS library](https://github.com/vitejs/vite/issues/3024)
- [some UMD libraries](https://github.com/vitejs/vite/issues/2679)

Vite 2 is a relatively new library and over time we expect it to become easier to use non-ESM libraries with Vite. However, you might also consider asking the library author to distribute an ESM version of their package or even converting the source for the package entirely to ESM. ESM is now the standard way to write JavaScript libraries and while there are a lot of legacy packages out there the ecosystem will become much easier to work with as more libraries convert to ESM.

The most common workarounds would be to `include` or `exclude` the offending package in [`optimizeDeps`](https://vitejs.dev/config/#dep-optimization-options), or to add it to [`ssr.external` or `ssr.noExternal`](https://vitejs.dev/config/#ssr-options).
