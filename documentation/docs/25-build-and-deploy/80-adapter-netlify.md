---
title: Netlify
---

To deploy to Netlify, use [`adapter-netlify`](https://github.com/sveltejs/kit/tree/main/packages/adapter-netlify).

This adapter will be installed by default when you use [`adapter-auto`](adapter-auto), but adding it to your project allows you to specify Netlify-specific options.

## Usage

Install with `npm i -D @sveltejs/adapter-netlify`, then add the adapter to your `vite.config.js`:

```js
// @errors: 2307
/// file: vite.config.js
import adapter from '@sveltejs/adapter-netlify';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter({
				// See below for an explanation of these options
				runtime: 'nodejs22.x',
				split: false
			})
		})
	]
});
```

Then, make sure you have a [netlify.toml](https://docs.netlify.com/configure-builds/file-based-configuration) file in the project root. This will determine where to write static assets based on the `build.publish` settings, as per this sample configuration:

```toml
[build]
	command = "npm run build"
	publish = "build"
```

If the `netlify.toml` file or the `build.publish` value is missing, a default value of `"build"` will be used.

> [!NOTE] If you have set the publish directory in the Netlify UI to something else then you will need to set it in `netlify.toml` too.

## Options

### `runtime`

The runtime to use. Set this to `'edge'` to deploy your app as a [Netlify Edge Function](https://docs.netlify.com/build/edge-functions/overview/), or use `'nodejs22.x'`, `'nodejs24.x'`, or `'nodejs26.x'`. If omitted, the Node.js runtime configured for the Netlify build is used.

### `split`

If `true`, your app will be split into multiple functions instead of a single one for the entire app.

## Route configuration

You can override the adapter's `runtime` for an individual route:

```js
/// file: src/routes/admin/+page.server.js
/** @type {import('@sveltejs/adapter-netlify').Config} */
export const config = { runtime: 'nodejs24.x' };
```

Route configuration follows the usual layout inheritance rules, so a config exported from a layout applies to its child routes. A child route can override the inherited value. Routes without a runtime config use the adapter's `runtime`.

Routes with the same runtime are grouped into one function by default. With `split: true`, each route pattern gets its own function while keeping its configured runtime. Prerendered routes do not emit functions, so their runtime config has no effect.

## Netlify alternatives to SvelteKit functionality

You may build your app using functionality provided directly by SvelteKit without relying on any Netlify functionality. Using the SvelteKit versions of these features will allow them to be used in dev mode, tested with integration tests, and to work with other adapters should you ever decide to switch away from Netlify. However, in some scenarios you may find it beneficial to use the Netlify versions of these features. One example would be if you're migrating an app that's already hosted on Netlify to SvelteKit.

### `_headers` and `_redirects`

The [`_headers`](https://docs.netlify.com/routing/headers/#syntax-for-the-headers-file) and [`_redirects`](https://docs.netlify.com/routing/redirects/redirect-options/) files specific to Netlify can be used for static asset responses (like images) by putting them into the project root folder. You can also use [`[[redirects]]`](https://docs.netlify.com/routing/redirects/#syntax-for-the-netlify-configuration-file) in your `netlify.toml`.

### Netlify Forms

1. Create your Netlify HTML form as described [here](https://docs.netlify.com/forms/setup/#html-forms), e.g. as `/routes/contact/+page.svelte`. (Don't forget to add the hidden `form-name` input element!)
2. Netlify's build bot parses your HTML files at deploy time, which means your form must be [prerendered](page-options#prerender) as HTML. You can either add `export const prerender = true` to your `contact.svelte` to prerender just that page or set the `prerender.force: true` option to prerender all pages.
3. If your Netlify form has a [custom success message](https://docs.netlify.com/forms/setup/#success-messages) like `<form netlify ... action="/success">` then ensure the corresponding `/routes/success/+page.svelte` exists and is prerendered.

### Netlify Functions

With this adapter, SvelteKit endpoints are hosted as [Netlify Functions](https://docs.netlify.com/functions/overview/). Netlify function handlers have additional context, including [Netlify Identity](https://docs.netlify.com/visitor-access/identity/) information. You can access this context via the `event.platform.context` field inside your hooks and `+page.server` or `+layout.server` endpoints. These are [serverless functions](https://docs.netlify.com/functions/overview/) by default or [edge functions](https://docs.netlify.com/edge-functions/overview/#app) when the `runtime` property is `'edge'`.

```js
// @errors: 2339
// @filename: ambient.d.ts
/// <reference types="@sveltejs/adapter-netlify" />
// @filename: +page.server.js
// ---cut---
/// file: +page.server.js
/** @type {import('./$types').PageServerLoad} */
export const load = async (event) => {
	const context = event.platform?.context;
	console.log(context); // shows up in your functions log in the Netlify app
};
```

Additionally, you can add your own Netlify functions by creating a directory for them and adding the configuration to your `netlify.toml` file. For example:

```toml
[build]
	command = "npm run build"
	publish = "build"

[functions]
	directory = "functions"
```

## Troubleshooting

### Accessing the file system

You can't use `fs` in edge deployments.

You _can_ use it in serverless deployments, but it won't work as expected, since files are not copied from your project into your deployment. Instead, use the [`read`]($app-server#read) function from `$app/server` to access your files. It also works inside edge deployments by fetching the file from the deployed public assets location.

Alternatively, you can [prerender](page-options#prerender) the routes in question.
