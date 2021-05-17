# adapter-netlify

Adapter for Svelte apps that creates a Netlify app, using a function for dynamic server rendering. A future version might use a function per route, though it's unclear if that has any real advantages.

This is very experimental; the adapter API isn't at all fleshed out, and things will definitely change.

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
		adapter: adapter(), // currently the adapter does not take any options
		target: '#svelte'
	}
};
```

Then, make sure you have a [netlify.toml](https://docs.netlify.com/configure-builds/file-based-configuration) file in the project root. This will determine where to write static assets and functions to based on the `build.publish` and `build.functions` settings, as per this sample configuration:

```toml
[build]
  command = "npm run build"
  publish = "build/"
  functions = "functions/"
```

It's recommended that you add the `build` and `functions` folders (or whichever other folders you specify) to your `.gitignore`.

## Customizing Setup

### Using Netlify Redirect Rules

During compilation a required "catch all" redirect rule is automatically appended to your `_redirects` file. (If it doesn't exist yet, it will be created.) That means:

- `[[redirects]]` in `netlify.toml` will never match as `_redirects` has a [higher priority](https://docs.netlify.com/routing/redirects/#rule-processing-order). So always put your rules in the [`_redirects` file](https://docs.netlify.com/routing/redirects/#syntax-for-the-redirects-file).
- `_redirects` shouldn't have any custom "catch all" rules such as `/* /foobar/:splat`. Otherwise the automatically appended rule will never be applied as Netlify is only processing [the first matching rule](https://docs.netlify.com/routing/redirects/#rule-processing-order).

### Defining Netlify Forms

1. Create your Netlify HTML form as described [here](https://docs.netlify.com/forms/setup/#html-forms), e.g. as `/routes/contact.svelte`. (Don't forget to add the hidden `form-name` input element!)
2. Netlify's build bot parses your HTML files at deploy time, which means your form must be [prerendered](https://kit.svelte.dev/docs#ssr-and-javascript-prerender) as HTML. You can either add `export const prerender = true` to your `contact.svelte` to prerender just that page or set the `kit.prerender.force: true` option to prerender all pages.
3. If your Netlify form has a [custom success message](https://docs.netlify.com/forms/setup/#success-messages), e.g. by using something like `<form netlify ... action="/success">`, then:
   - Ensure `/routes/success.svelte` exists
   - In it add the same prerender hint as in step 2
