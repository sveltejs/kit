---
title: Building
---

Up until now we've been using `sapper dev` to build our application and run a development server. But when it comes to production, we want to create a self-contained optimized build.

### sapper build

This command packages up your application into the `__sapper__/build` directory. (You can change this to a custom directory, as well as controlling various other options — do `sapper build --help` for more information.)

The output is a Node app that you can run from the project root:

```bash
node __sapper__/build
```

### Browser support

Your site is built only for the latest versions of modern evergreen browsers by default. If you are using Rollup, you can use the `--legacy`<sup>1</sup> flag to build a second bundle that can be used to support legacy browsers like Internet Explorer. Sapper will then serve up the correct bundle at runtime<sup>2</sup>.

When using `--legacy`, Sapper will pass an environment variable `SAPPER_LEGACY_BUILD` to your Rollup config. Sapper will then build your client-side bundle twice: once with `SAPPER_LEGACY_BUILD` set to `true` and once with it set to `false`. [sapper-template-rollup](https://github.com/sveltejs/sapper-template-rollup) provides an example of utilizing this configuration.<sup>3</sup>

You may wish to add this flag to a script in your `package.json`:
```js
  "scripts": {
    "build": "sapper build --legacy",
  },
```

1. This option is unrelated to Svelte's `legacy` option
2. Browsers which do not support `async/await` syntax will be served the legacy bundle
3. You will also need to polyfill APIs that are not present in older browsers.
