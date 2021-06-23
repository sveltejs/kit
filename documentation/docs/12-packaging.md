---
title: Packaging
---

You can use SvelteKit to build component libraries as well as apps.

When you're creating an app, the contents of `src/routes` is the public-facing stuff; [`src/lib`](#modules-lib) contains your app's internal library.

A SvelteKit component library has the exact same structure as a SvelteKit app, except that `src/lib` is the public-facing bit. `src/routes` might be a documentation or demo site that accompanies the library, or it might just be a sandbox you use during development.

Running `svelte-kit package` will take the contents of `src/lib` and generate a `package` directory (which can be [configured](#configuration-package)) containing the following:

- All the files in `src/lib`, unless you [configure](#configuration-package) custom `include`/`exclude` options. Svelte components will be preprocessed (but note the [caveats](#packaging-caveats) below)
- A `package.json` that copies the `name`, `version`, `description`, `keywords`, `homepage`, `bugs`, `license`, `author`, `contributors`, `funding`, `repository`, `dependencies`, `private`, `files` and `publishConfig` fields from the root of the project, and adds a `"type": "module"` and an `"exports"` field

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

```
npm publish package
```

If you configure a custom [`package.dir`](#configuration-package), change `package` accordingly.

### Caveats

This is a relatively experimental feature and is not yet fully implemented:

- if a preprocessor is specified, `.svelte` files are transformed (meaning they can contain TypeScript, for example), but `.d.ts` files are not generated
- `.ts` files are not currently transformed, and will cause the process to fail
- all other files are copied across as-is
