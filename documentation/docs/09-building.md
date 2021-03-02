---
title: Building
---

Up until now we've been using `svelte-kit dev` to build our application and run a development server. But when it comes to production, we want to create a self-contained optimized build.

### svelte-kit build

This command packages up your application into the `.svelte/build` directory. (You can change this to a custom directory, as well as controlling various other options — do `svelte-kit build --help` for more information.)

The output is a Node app that you can run from the project root:

```bash
node .svelte/build
```

### svelte-kit start

This command runs your build output as a Node app. You can pass two options to it:

- `--port $PORT` — Set the port that the application runs on. Defaults to port 3000.
- `--open` — Opens a browser tab on launch (defaults to false)

### svelte-kit adapt

This command packages your build output into a platform-specific format. The command will use the adapter defined in your `svelte.config.cjs` file. For example, you can use `@sveltejs/adapter-static` to "export" your site, or `@sveltejs/adapter-vercel` to deploy to Vercel as a serverless app.

```js
// svelte.config.cjs
// ...
module.exports = {
	// ...
	kit: {
		adapter: '@sveltejs/adapter-node'
		// ...
	}
	// ...
};
```

### Browser support

Your site is built only for the latest versions of modern evergreen browsers.

Sapper, the predecessor to SvelteKit, supported an option for to support legacy browsers. This does not yet exist in SvelteKit. In Sapper, if you are using Rollup, you can use the `--legacy`<sup>1</sup> flag to build a second bundle that can be used to support legacy browsers like Internet Explorer. Sapper will then serve up the correct bundle at runtime<sup>2</sup>.

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
