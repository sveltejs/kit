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
 +---- CHANGELOG.md                 # (optional)
 +---- jsconfig.json                # or 'tsconfig.json' (optional)
 +---- package.json
 +---- playwright.config.js         # (optional)
 +---- README.md                    # (optional)
 +---- svelte.config.js
```

If using TypeScript, the scripts files in the `src/` directory will have a `.ts` file extension.

### package.json

The `package.json` file is a standard file where you can configure your `dependencies` and `devDependencies`. [Read more in the npm docs](https://docs.npmjs.com/cli/v7/configuring-npm/package-json).

SvelteKit is ESM-first so we use `"type": "module"` settings. In the `"scripts"` property, you can see scripts used for building the project, running the dev server, packaging a library (optional), and running other tools for linting, formatting, type checking, testing etc.

### svelte.config.js

Contains [configuration](configuration) for the SvelteKit project.

### static/

Holds your static assets. These are files that are not processed by Vite but are just copied to the build folder by the adapter when building the application.

### src/

Holds all Svelte, JS and other files used to implement your app.

#### app.html

Is entry files, to which is Svelte app parsed. It contain some placeholders like `%svelte.head%`, `%svelte.body%` or `%svelte.assets%`. These placeholders will be removed and replaced by actual content at build or ssr.

`%svelte.head%` is replaced mostly with `<link>` and `<script>` tags, that makes your application possible to work. But it's also used as place to which put content from your `<svelte:head>` tags defined in your layouts and pages.

`%svelte.body%` is where whole content (HTML) as well as self-hydratating JavaScript code is put.

`%svelte.assets%` is replaced by actual base path to assets. This is typically empty string and often not needed, but if you choose to change `config.kit.paths` option in `svelte.config.js` for some reasons, it will help to correctly load assets.

#### routes/

Is most important folder in your project. Those contain Pages and Endpoints as well as Layouts and private module files. SvelteKit use file-based routing, so Pages and Endpoints in this folder map to path of URL.

#### lib/

Is folder that contain other files you use in app. Those files can be Components, Stores, util files, some data, or even server-side files (if they are not imported to any client-side file (like `.svelte` Page or Component file), they are not exposed to client-side). But if you are creating package, whole content of `lib/` folder is used to generate package, if it's not configured otherwise in `svelte.config.js`.

#### hooks.js or hooks/

Is folder or file that contain hooks. Those are functions executed at every request. Read more about them in [Hooks](hooks) section. Top scope of this file can be used for initialization code like database connection for example.

#### params/

Contain [param matchers](routing#advanced-routing-matching) that can be used for dynamic pages or endpoints.

#### service-worker.js or service-worker/

Contain your code for [service-worker](service-workers). If is present, service-worker will be automatically registered by SvelteKit.

#### other files in src/ folder.

`src/` folder can contain also `app.css` files that contain global styles, or `app.d.ts` (if you use type-checking) used by TypeScript that contains type definitions in `App` namespace.

### build/

The output location for your project will depend on which adapter you use. Many adapters will use the `build/` folder as the output location for your compiled app prepared for deploying to production.

### .svelte-kit/

Holds Vite output used directly when you run `npm run dev` or as intermediate output of `npm run build`.

### other optional files and tests folder in root directory

based on options you selected when initializing project, there are generated bunch of other files used for tools like Git, ESLint, Prettier, TypeScript, or PlayWright.
