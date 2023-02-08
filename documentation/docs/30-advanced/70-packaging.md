---
title: Packaging
---

You can use SvelteKit to build apps as well as component libraries, using the `@sveltejs/package` package (`npm create svelte` has an option to set this up for you).

When you're creating an app, the contents of `src/routes` is the public-facing stuff; [`src/lib`](modules#$lib) contains your app's internal library.

A component library has the exact same structure as a SvelteKit app, except that `src/lib` is the public-facing bit, and your root `package.json` is used to publish the package. `src/routes` might be a documentation or demo site that accompanies the library, or it might just be a sandbox you use during development.

Running the `svelte-package` command from `@sveltejs/package` will take the contents of `src/lib` and generate a `dist` directory (which can be [configured](#options)) containing the following:

- All the files in `src/lib`. Svelte components will be preprocessed, TypeScript files will be transpiled to JavaScript.
- Type definitions (`d.ts` files) which are generated for Svelte, JavaScript and TypeScript files. You need to install `typescript >= 4.0.0` for this. Type definitions are placed next to their implementation, hand-written `d.ts` files are copied over as is. You can [disable generation](#options), but we strongly recommend against it — people using your library might use TypeScript, for which they require these type definition files.

> `@sveltejs/package` version 1 also copied over a generated `package.json`. This is no longer the case. If you're still on version 1, see [this PR](https://github.com/sveltejs/kit/pull/8922) for migration instructions.

## Anatomy of a package.json

Since you're now building a library for public use, the contents of your `package.json` will become more important. Through it, you configure the entry points of your package, which files are published to npm, and which dependencies your library has. Let's go through the most important fields one by one.

### name

This is the name of your package. It will be available for others to install using that name, and visible on `https://npmjs.com/package/<name>`.

```json
{
    "name": "my-great-component-library"
}
```

Read more about it [here](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#name).

### license

Every package should have a license field so people know how they are allowed to use it. A very popular license which is also very permissive in terms of distribution and reuse without warranty is `MIT`.

```json
{
    "license": "MIT"
}
```

Read more about it [here](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#license). Note that you should also include a `LICENSE` file in your package.

### files

This tells npm which files it will pack up and upload to npm. It should contain your output folder (`dist` by default). Your `package.json` and `README` and `LICENSE` will always be included, so you don't need to specify them.

```json
{
    "files": ["dist"]
}
```

Read more about it [here](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#files).

### exports

The `"exports"` field contains the package's entry points. If you set up a new library project through `npm create svelte@latest`, it's set to a single export, the package root:

```json
{
    "exports": {
        ".": "./dist/index.js"
    }
}
```

This tells bundlers and tooling that your package only has one entry point, the root, and everything should be imported through that, like this:

```js
import { Something } from 'your-package';
```

You can adjust this to your liking and provide more entry points. For example, if you had a `src/lib/Foo.svelte` component and a `src/lib/index.js` module that re-exported it, and a `package.json` with the follwing exports...

```json
{
    "exports": {
        ".": "./dist/index.js",
        "./Foo.svelte": "./dist/Foo.svelte"
    }
}
```

...then a consumer of your library could do either of the following:

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

In general, each key of the exports map is the path the user will have to use to import something from your package, and the value is the path to the file that will be imported.

`exports` also supports so-called export conditions. These tell bundlers and tooling what to import depending on some condition. You could use that to provide both a compiled and uncompiled version of your components which can be imported through the same path.

```json
{
    "exports": {
        ".": {
            "svelte": "./Raw.svelte",
            "default": "./compiled.js"
        }
    }
}
```

The above exports map tells bundler to use `Raw.svelte` when they are running inside a Svelte application and `compiled.js` when they are used outside one and need a self-contained bundle.

Read more about `exports` [here](https://nodejs.org/docs/latest-v18.x/api/packages.html#package-entry-points).

## Best practices

You should avoid using [SvelteKit-specific modules](modules) like `$app` in your packages unless you intend for them to only be consumable by other SvelteKit projects. E.g. rather than using `import { browser } from '$app/environment'` you could use [`import.meta.env.SSR`](https://vitejs.dev/guide/env-and-mode.html#env-variables) to make the library available to all Vite-based projects or better yet use [Node conditional exports](https://nodejs.org/api/packages.html#conditional-exports) to make it work for all bundlers. You may also wish to pass in things like the current URL or a navigation action as a prop rather than relying directly on `$app/stores`, `$app/navigation`, etc. Writing your app in this more generic fashion will also make it easier to setup tools for testing, UI demos and so on.

## Options

`svelte-package` accepts the following options:

- `-w`/`--watch` — watch files in `src/lib` for changes and rebuild the package
- `-i`/`--input` — the input directory which contains all the files of the package. Defaults to `src/lib`
- `-o`/`--o` — the output directory where the processed files are written to. You `package.json`'s `exports` should point to files inside there, and the `files` array should include that folder. Defaults to `dist`
- `-t`/`--types` — whether or not to create type definitions (`d.ts` files). We strongly recommend doing this as it fosters ecosystem library quality. Defaults to `true`

## Publishing

To publish the generated package:

```sh
npm publish
```

## Caveats

All relative file imports need to be fully specified, adhering to Node's ESM algorithm. This means you cannot import the file `src/lib/something/index.js` like `import { something } from './something`, instead you need to import it like this: `import { something } from './something/index.js`. If you are using TypeScript, you need to import `.ts` files the same way, but using a `.js` file ending, _not_ a `.ts` file ending (this isn't under our control, the TypeScript team has made that decision). Setting `"moduleResolution": "NodeNext"` in your `tsconfig.json` or `jsconfig.json` will help you with this.

This is a relatively experimental feature and is not yet fully implemented. All files except Svelte files (preprocessed) and TypeScript files (transpiled to JavaScript) are copied across as-is.
