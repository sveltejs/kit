---
title: Packaging
---

> `svelte-package` is currently experimental. Non-backward compatible changes may occur in any future release.

You can use SvelteKit to build apps as well as component libraries, using the `@sveltejs/package` package (`npm create svelte` has an option to set this up for you).

When you're creating an app, the contents of `src/routes` is the public-facing stuff; [`src/lib`](/docs/modules#$lib) contains your app's internal library.

A component library has the exact same structure as a SvelteKit app, except that `src/lib` is the public-facing bit. `src/routes` might be a documentation or demo site that accompanies the library, or it might just be a sandbox you use during development.

Running the `svelte-package` command from `@sveltejs/package` will take the contents of `src/lib` and generate a `package` directory (which can be [configured](/docs/configuration#package)) containing the following:

- All the files in `src/lib`, unless you [configure](/docs/configuration#package) custom `include`/`exclude` options. Svelte components will be preprocessed, TypeScript files will be transpiled to JavaScript.
- Type definitions (`d.ts` files) which are generated for Svelte, JavaScript and TypeScript files. You need to install `typescript >= 4.0.0` for this. Type definitions are placed next to their implementation, hand-written `d.ts` files are copied over as is. You can [disable generation](/docs/configuration#package), but we strongly recommend against it.
- A `package.json` copied from the project root with all fields except `"scripts"`, `"publishConfig.directory"` and `"publishConfig.linkDirectory"`. The `"dependencies"` field is included, which means you should add packages that you only need for your documentation or demo site to `"devDependencies"`. A `"type": "module"` and an `"exports"` field will be added if it's not defined in the original file.

The `"exports"` field contains the package's entry points. By default, all files in `src/lib` will be treated as an entry point unless they start with (or live in a directory that starts with) an underscore, but you can [configure](/docs/configuration#package) this behaviour. If you have a `src/lib/index.js` or `src/lib/index.svelte` file, it will be treated as the package root.

For example, if you had a `src/lib/Foo.svelte` component and a `src/lib/index.js` module that re-exported it, a consumer of your library could do either of the following:

```js
// @filename: ambient.d.ts
declare module 'your-library';

// @filename: index.js
// ---cut---
import { Foo } from 'your-library';
```

```js
// @filename: ambient.d.ts
declare module 'your-library/Foo.svelte';

// @filename: index.js
// ---cut---
import Foo from 'your-library/Foo.svelte';
```

> You should avoid using [SvelteKit-specific modules](/docs/modules) like `$app` in your packages unless you intend for them to only be consumable by other SvelteKit projects. E.g. rather than using `import { browser } from '$app/environment';` you could use [`import.meta.env.SSR`](https://vitejs.dev/guide/env-and-mode.html#env-variables) to make the library available to all Vite-based projects or better yet use [Node conditional exports](https://nodejs.org/api/packages.html#conditional-exports) to make it work for all bundlers. You may also wish to pass in things like the current URL or a navigation action as a prop rather than relying directly on `$app/stores`, `$app/navigation`, etc. Writing your app in this more generic fashion will also make it easier to setup tools for testing, UI demos, etc.

### Options

`svelte-package` accepts the following options:

- `-w`/`--watch` — watch files in `src/lib` for changes and rebuild the package

### Publishing

To publish the generated package:

```sh
npm publish ./package
```

The `./package` above is referring to the directory name generated, change accordingly if you configure a custom [`package.dir`](/docs/configuration#package).

### Caveats

All relative file imports need to be fully specified, adhering to Node's ESM algorithm. This means you cannot import the file `src/lib/something/index.js` like `import { something } from './something`, instead you need to import it like this: `import { something } from './something/index.js`. If you are using TypeScript, you need to import `.ts` files the same way, but using a `.js` file ending, _not_ a `.ts` file ending (this isn't under our control, the TypeScript team has made that decision). Setting `"moduleResolution": "NodeNext"` in your `tsconfig.json` or `jsconfig.json` will help you with this.

This is a relatively experimental feature and is not yet fully implemented. All files except Svelte files (preprocessed) and TypeScript files (transpiled to JavaScript) are copied across as-is.
