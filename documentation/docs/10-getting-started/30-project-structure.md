---
title: Project structure
---

A typical SvelteKit project contains the following files and directories:

```bash
my-project/
├ src/
│ ├ lib/
│ │ └ [your lib files]
│ ├ routes/
│ │ └ [your routes]
│ ├ app.html
├ static/
│ └ [your static assets]
├ package.json
├ svelte.config.js
├ tsconfig.json [or jsconfig.json]
└ vite.config.js
```

You'll also find common files like `.gitignore` and `.npmrc` (and `.prettierrc` and `.eslintrc.cjs` and so on, if you chose those options when running `npm create svelte@latest`).

## Project files

### src

The `src` directory contains your project files. All necessary and optional files and directories include:

- `lib` (optional) contains your library code (utilities and components), which can be imported via the [`$lib`](/docs/modules#$lib) alias, or packaged up for distribution using [`svelte-package`](/docs/packaging)
  - `server` (optional) contains your server-only library code. Files in this directory can be imported by using the [`$lib/server`](/docs/server-only-modules) alias. SvelteKit will prevent you from importing these in client code.
- `params` (optional) contains any [param matchers](/docs/advanced-routing#matching) your app needs
- `routes` contains the [routes](/docs/routing) of your application. You can also colocate other components that are only used within a single route here
- `app.html` is your page template — an HTML document containing the following placeholders:
  - `%sveltekit.head%` — `<link>` and `<script>` elements needed by the app, plus any `<svelte:head>` content
  - `%sveltekit.body%` — the markup for a rendered page. This should live inside a `<div>` or other element, rather than directly inside `<body>`, to prevent bugs caused by browser extensions injecting elements that are then destroyed by the hydration process. SvelteKit will warn you in development if this is not the case
  - `%sveltekit.assets%` — either [`paths.assets`](/docs/configuration#paths), if specified, or a relative path to [`paths.base`](/docs/configuration#paths)
  - `%sveltekit.nonce%` — a [CSP](/docs/configuration#csp) nonce for manually included links and scripts, if used
  - `%sveltekit.env.[NAME]%` - this will be replaced at render time with the `[NAME]` environment variable, which must begin with the [`publicPrefix`](https://kit.svelte.dev/docs/configuration#env) (usually `PUBLIC_`). It will fallback to `''` if not matched.
- `error.html` (optional) is the page that is rendered when everything else fails. It can contain the following placeholders:
  - `%sveltekit.status%` — the HTTP status
  - `%sveltekit.error.message%` — the error message
- `hooks.server.js` or `hooks.client.js` (optional) contains your application's [hooks](/docs/hooks)
- `service-worker.js` (optional) contains your [service worker](/docs/service-workers)

You can use `.ts` files instead of `.js` files, if using TypeScript.

If you added [Vitest](https://vitest.dev) when you set up your project, your unit tests will live in the `src` directory with a `.test.js` (or `.test.ts`) extension.

### static

Any static assets that should be served as-is, like `robots.txt` or `favicon.png`, go in here. This directory is optional.

### tests

If you added [Playwright](https://playwright.dev/) for browser testing when you set up your project, the tests will live in this directory. This directory is optional.

### package.json

Your `package.json` file must include `@sveltejs/kit`, `svelte` and `vite` as `devDependencies`.

When you create a project with `npm create svelte@latest`, you'll also notice that `package.json` includes `"type": "module"`. This means that `.js` files are interpreted as native JavaScript modules with `import` and `export` keywords. Legacy CommonJS files need a `.cjs` file extension.

### svelte.config.js

This file contains your Svelte and SvelteKit [configuration](/docs/configuration).

### tsconfig.json

This file (or `jsconfig.json`, if you prefer type-checked `.js` files over `.ts` files) configures TypeScript, if you added typechecking during `npm create svelte@latest`. Since SvelteKit relies on certain configuration being set a specific way, it generates its own `.svelte-kit/tsconfig.json` file which your own config `extends`.

Although optional, it's highly recommended to keep this in your project in order for [generated types](/docs/types#generated-types) to provide helpful type inferences for data passed between pages and back-end code as well as path alias autocomplete for `$lib` and [custom path aliases](/docs/configuration#alias) defined in `svelte.config.js`.

### vite.config.js

A SvelteKit project is really just a [Vite](https://vitejs.dev) project that uses the [`@sveltejs/kit/vite`](/docs/modules#sveltejs-kit-vite) plugin, along with any other [Vite configuration](https://vitejs.dev/config/).

## Other files

### .svelte-kit

As you develop and build your project, SvelteKit will generate files in a `.svelte-kit` directory (configurable as [`outDir`](/docs/configuration#outdir)). You can ignore its contents, and delete them at any time (they will be regenerated when you next `dev` or `build`).
