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

## Extra Resources

Guide for SvelteKit + Netlify Forms users: https://dev.to/swyx/how-to-use-sveltekit-with-netlify-forms-5gmj
