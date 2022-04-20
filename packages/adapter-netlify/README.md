# adapter-netlify

A SvelteKit adapter that creates a Netlify app.

If you're using [adapter-auto](../adapter-auto), you don't need to install this unless you need to specify Netlify-specific options, since it's already included.

## Installation

```bash
npm i -D @sveltejs/adapter-netlify
```

You can then configure it inside of `svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-netlify';

export default {
	kit: {
		// default options are shown
		adapter: adapter({
			// if true, will create a Netlify Edge Function rather
			// than using standard Node-based functions
			edge: false,

			// if true, will split your app into multiple functions
			// instead of creating a single one for the entire app.
			// if `edge` is true, this option cannot be used
			split: false
		})
	}
};
```

Then, make sure you have a [netlify.toml](https://docs.netlify.com/configure-builds/file-based-configuration) file in the project root. This will determine where to write static assets based on the `build.publish` settings, as per this sample configuration:

```toml
[build]
  command = "npm run build"
  publish = "build"
```

If the `netlify.toml` file or the `build.publish` value is missing, a default value of `"build"` will be used. Note that if you have set the publish directory in the Netlify UI to something else then you will need to set it in `netlify.toml` too, or use the default value of `"build"`.

## Netlify Edge Functions (beta)

SvelteKit supports the beta release of Netlify Edge Functions. If you pass the option `edge: true` to the `adapter` function, server-side rendering will happen in a Deno-based edge function that's deployed close to the site visitor. If set to `false` (the default), the site will deploy to standard Node-based Netlify Functions.

## Netlify alternatives to SvelteKit functionality

You may build your app using functionality provided directly by SvelteKit without relying on any Netlify functionality. Using the SvelteKit versions of these features will allow them to be used in dev mode, tested with integration tests, and to work with other adapters should you ever decide to switch away from Netlify. However, in some scenarios you may find it beneficial to use the Netlify versions of these features. One example would be if you're migrating an app that's already hosted on Netlify to SvelteKit.

### Using Netlify Redirect Rules

During compilation, redirect rules are automatically appended to your `_redirects` file. (If it doesn't exist yet, it will be created.) That means:

- `[[redirects]]` in `netlify.toml` will never match as `_redirects` has a [higher priority](https://docs.netlify.com/routing/redirects/#rule-processing-order). So always put your rules in the [`_redirects` file](https://docs.netlify.com/routing/redirects/#syntax-for-the-redirects-file).
- `_redirects` shouldn't have any custom "catch all" rules such as `/* /foobar/:splat`. Otherwise the automatically appended rule will never be applied as Netlify is only processing [the first matching rule](https://docs.netlify.com/routing/redirects/#rule-processing-order).

### Using Netlify Forms

1. Create your Netlify HTML form as described [here](https://docs.netlify.com/forms/setup/#html-forms), e.g. as `/routes/contact.svelte`. (Don't forget to add the hidden `form-name` input element!)
2. Netlify's build bot parses your HTML files at deploy time, which means your form must be [prerendered](https://kit.svelte.dev/docs/page-options#prerender) as HTML. You can either add `export const prerender = true` to your `contact.svelte` to prerender just that page or set the `kit.prerender.force: true` option to prerender all pages.
3. If your Netlify form has a [custom success message](https://docs.netlify.com/forms/setup/#success-messages) like `<form netlify ... action="/success">` then ensure the corresponding `/routes/success.svelte` exists and is prerendered.

### Using Netlify Functions

With this adapter, SvelteKit endpoints are hosted as [Netlify Functions](https://docs.netlify.com/functions/overview/). Netlify function handlers have additional context, including [Netlify Identity](https://docs.netlify.com/visitor-access/identity/) information. You can access this context via the `event.platform.context` field inside your hooks and endpoints.

Additionally, you can add your own Netlify functions by creating a directory for them and adding the configuration to your `netlify.toml` file. For example:

```toml
[build]
  command = "npm run build"
  publish = "build"

[functions]
  directory = "functions"
```

## Changelog

[The Changelog for this package is available on GitHub](https://github.com/sveltejs/kit/blob/master/packages/adapter-netlify/CHANGELOG.md).
