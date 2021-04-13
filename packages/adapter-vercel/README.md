# adapter-vercel

Adapter for Svelte apps that creates a Vercel app, using a function for dynamic server rendering.

## Usage

Add `"@sveltejs/adapter-vercel": "next"` to the `devDependencies` in your `package.json` and run `npm install`.

Then in your `svelte.config.js`:

```js
const vercel = require('@sveltejs/adapter-vercel');

module.exports = {
	kit: {
		...
		adapter: vercel()
	}
};
```

You can set a custom build output directory by passing an option to the adapter:

```js
vercel({ out: 'my-output-directory' }); // defaults to `.vercel_build_output`
```
