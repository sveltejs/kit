---
title: Project files
---

The bulk of your app, in `src/routes`, can be left where it is, but several project files will need to be moved or updated.

### Configuration

Your `webpack.config.js` or `rollup.config.js` should be replaced with a `svelte.config.js`, as documented [here](/docs#configuration). Svelte preprocessor options should be moved to `config.preprocess`.

You will need to add an [adapter](/docs#adapters). `sapper build` is roughly equivalent to [adapter-node](https://github.com/sveltejs/kit/tree/master/packages/adapter-node) while `sapper export` is roughly equivalent to [adapter-static](https://github.com/sveltejs/kit/tree/master/packages/adapter-static), though you might prefer to use an adapter designed for the platform you're deploying to.

If you were using plugins for filetypes that are not automatically handled by [Vite](https://vitejs.dev), you will need to find Vite equivalents and add them to the [Vite config](/docs#configuration-vite).

### src/client.js

This file has no equivalent in SvelteKit. Any custom logic (beyond `sapper.start(...)`) should be expressed in your `__layout.svelte` file, inside an `onMount` callback.

### src/server.js

This file also has no direct equivalent, since SvelteKit apps can run in serverless environments. You can, however, use the [hooks module](/docs#hooks) to implement session logic.

### src/service-worker.js

Most imports from `@sapper/service-worker` have equivalents in [`$service-worker`](/docs#modules-service-worker):

- `timestamp` is unchanged
- `files` is unchanged
- `shell` is now `build`
- `routes` has been removed

### src/template.html

The `src/template.html` file should be renamed `src/app.html`.

Remove `%sapper.base%`, `%sapper.scripts%` and `%sapper.styles%`. Replace `%sapper.head%` with `%svelte.head%` and `%sapper.html%` with `%svelte.body%`.

The `<div id="sapper">` is no longer necessary, though you can continue mounting the app to a wrapper element by specifying it with the [`target`](/docs#configuration-target) config option.

### src/node_modules

A common pattern in Sapper apps is to put your internal library in a directory inside `src/node_modules`. This doesn't work with Vite, so we use [`src/lib`](/docs#modules-lib) instead.
