# adapter-vercel

Adapter for Svelte apps that creates a Vercel app, using a function for dynamic server rendering.

## Usage

Add `"@sveltejs/adapter-vercel": "next"` to the `devDependencies` in your `package.json` and run `npm install`.

Then in your `svelte.config.js`:

```js
import vercel from '@sveltejs/adapter-vercel';

export default {
	kit: {
		...
		adapter: vercel(options)
	}
};
```

## Options

You can pass an `options` argument, if necessary, with the following:

- `external` — an array of dependencies that [esbuild](https://esbuild.github.io/api/#external) should treat as external

## Changelog

[The Changelog for this package is available on GitHub](https://github.com/sveltejs/kit/blob/master/packages/adapter-vercel/CHANGELOG.md).
