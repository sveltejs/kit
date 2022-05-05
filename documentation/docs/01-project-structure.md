---
title: Project Structure
---

The basic structure of a SvelteKit project is:

```sh
my-app/
 |
 +---- .svelte-kit/                 # (generated at dev)
 +---- build/                       # (generated at build)
 +---- src/
 |       |
 |       +---- lib/                 # (optional)
 |       +---- params/              # (optional)
 |       +---- routes/
 |       +---- app.css              # (optional)
 |       +---- app.d.ts             # (optional)
 |       +---- app.html
 |       +---- hooks.js             # or 'hooks/' (optional)
 |       +---- service-worker.js    # (optional)
 +---- static/
 +---- tests/                       # (optional)
 +---- .eslintrtc.cjs               # (optional)
 +---- .gitignore                   # (optional)
 +---- .npmrc
 +---- .prettierrc                  # (optional)
 +---- jsconfig.json                # or 'tsconfig.json' (optional)
 +---- package.json
 +---- playwright.config.js         # (optional)
 +---- svelte.config.js
```

If using TypeScript, the scripts files in the `src/` directory will have a `.ts` file extension.

### package.json

The `package.json` file is a standard file where you can configure your `dependencies` and `devDependencies`. [Read more in the npm docs](https://docs.npmjs.com/cli/v7/configuring-npm/package-json).

SvelteKit is ESM-first so we set `"type": "module"`. In the `"scripts"` property, you can see scripts used for building the project, running the dev server, packaging a library (optional), and running other tools for linting, formatting, type checking, testing etc.

### svelte.config.js

Contains [configuration](configuration) for the SvelteKit project.

### static/

Holds your static assets. These are files that are not processed by Vite but are just copied to the build folder by the adapter when building the application.

### src/

Holds the Svelte, JS/TS, and other source files for your app.

#### src/app.html

This is the entry point to your application. It contains placeholders like `%svelte.head%`, `%svelte.body%`, and `%svelte.assets%`. These placeholders will be removed and replaced by actual content at build or SSR.

`%svelte.head%` is replaced with `<link>` and `<script>` tags that power the application as well as content from the [`<svelte:head>`](https://svelte.dev/docs#template-syntax-svelte-head) tags defined in your layouts and pages.

`%svelte.body%` is where the HTML for your application is rendered.

`%svelte.assets%` is replaced by the [assets base path](configuration#paths).

#### src/routes/

Contains your [pages](routing#pages), [endpoints](routing#endpoints), and [layouts](layouts) and can also hold private module files. SvelteKit use file-based routing, so the file path of the pages and endpoints in this folder map to the URL which renders them.

#### src/lib/

A folder that contains source for non-routing related files used by your application. They can be imported via the `$lib` alias. If you are creating a library, the contents of the `lib/` folder are used by default to generate the package when you run [`svelte-kit package`](packaging).

#### src/hooks.js or src/hooks/

A folder or file that contain [hooks](hooks) functions executed at every request. The top scope of this file can be used for initialization code like a database connection.

#### src/params/

Contains [param matchers](routing#advanced-routing-matching) that can be used for dynamic pages or endpoints.

#### src/service-worker.js or src/service-worker/

Optionally contains code for your [service-worker](service-worker).

#### other files in src/ folder.

The `src/` folder can also contain an `app.css` file with global styles or an `app.d.ts` file with type definitions.

### build/

The output location for your project will depend on which adapter you use. Many adapters will use the `build/` folder as the output location for your compiled app prepared for deploying to production.

### .svelte-kit/

Holds Vite output used directly when you run `npm run dev` or as intermediate output of `npm run build`.

### Other

Based on options you selected when initializing the project, there other files will be generated for tools like Git, ESLint, Prettier, TypeScript, and PlayWright.
