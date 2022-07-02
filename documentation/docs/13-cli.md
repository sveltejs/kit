---
title: Command Line Interface
---

SvelteKit projects use Vite as a development server and to build distributables and so you will mostly use its CLI. However, SvelteKit includes a command line interface for packaging libraries.

### svelte-kit package

> `svelte-kit package` is currently experimental and is not subject to Semantic Versioning rules. Non-backward compatible changes may occur in any future release.

For package authors, see [packaging](/docs/packaging). `svelte-kit package` accepts the following options:

- `-w`/`--watch` — watch files in `src/lib` for changes and rebuild the package

### svelte-kit sync

`svelte-kit sync` creates the generated files for your project such as types and a `tsconfig.json`. When you create a new project, it is listed as the `prepare` script and will be run automatically as part of the npm lifecycle, so you should not ordinarily have to run this command.
