# adapter-netlify

A SvelteKit adapter that creates a Netlify app.

If you're using [adapter-auto](../adapter-auto), you don't need to install this unless you need to specify Netlify-specific options, since it's already included.

## Installation

> ⚠️ For the time being, the latest version of adapter-netlify is at the @next tag. If you get the error `config.kit.adapter should be an object with an "adapt" method.`, this is a sign that you are using the wrong version (eg `1.0.0-next.0` instead of `1.0.0-next.9`).

```bash
npm i -D @sveltejs/adapter-netlify@next
```

You can then configure it inside of `svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-netlify';

export default {
	kit: {
		adapter: adapter({
			// if true, will split your app into multiple functions
			// instead of creating a single one for the entire app
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

[Netlify Functions](https://docs.netlify.com/functions/overview/) can be used alongside your SvelteKit routes. If you would like to add them to your site, you should create a directory for them and add the configuration to your `netlify.toml` file. For example:

```toml
[build]
  command = "npm run build"
  publish = "build"

[functions]
  directory = "functions"
```

## Changelog

[The Changelog for this package is available on GitHub](https://github.com/sveltejs/kit/blob/master/packages/adapter-netlify/CHANGELOG.md).
