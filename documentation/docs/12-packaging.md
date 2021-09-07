---
title: Packaging
---

You can use SvelteKit to build component libraries as well as apps.

When you're creating an app, the contents of `src/routes` is the public-facing stuff; [`src/lib`](#modules-lib) contains your app's internal library.

A SvelteKit component library has the exact same structure as a SvelteKit app, except that `src/lib` is the public-facing bit. `src/routes` might be a documentation or demo site that accompanies the library, or it might just be a sandbox you use during development.

Running `svelte-kit package` will take the contents of `src/lib` and generate a `package` directory (which can be [configured](#configuration-package)) containing the following:

- All the files in `src/lib`, unless you [configure](#configuration-package) custom `include`/`exclude` options. Svelte components will be preprocessed, TypeScript files will be transpiled to JavaScript.
- Type definitions (`d.ts` files) which are generated for Svelte, JavaScript and TypeScript files. You need to install `typescript >= 4.0.0` and `svelte2tsx >= 0.4.1` for this. Type definitions are placed next to their implementation, hand-written `d.ts` files are copied over as is. You can [disable generation](#configuration-package), but we strongly recommend against it.
- A `package.json` copied from the project root without the `"scripts"` field and adds a `"type": "module"`. An `"exports"` field will also be added if it's not defined in the original file.

The `"exports"` field contains the package's entry points. By default, all files in `src/lib` will be treated as an entry point unless they start with (or live in a directory that starts with) an underscore, but you can [configure](#configuration-package) this behaviour. If you have a `src/lib/index.js` or `src/lib/index.svelte` file, it will be treated as the package root.

For example, if you had a `src/lib/Foo.svelte` component and a `src/lib/index.js` module that re-exported it, a consumer of your library could do either of the following:

```js
import { Foo } from 'your-library';
```

```js
import Foo from 'your-library/Foo.svelte';
```

### Publishing

To publish the generated package:

```sh
npm publish ./package
```

The `./package` above is referring to the directory name generated, change accordingly if you configure a custom [`package.dir`](#configuration-package).

### Caveats

This is a relatively experimental feature and is not yet fully implemented. All files except Svelte files (preprocessed) and TypeScript files (transpiled to JavaScript) are copied across as-is.
