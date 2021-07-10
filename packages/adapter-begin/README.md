# adapter-begin

Adapter for Svelte apps that creates a [Begin](https://begin.com/) app, using a function for dynamic server rendering.

## Configuration

Add `"@sveltejs/adapter-begin": "next"` to the `devDependencies` in your `package.json` and run `npm install`.

Then add the adapter to your `svelte.config.js`:

```js
import begin from '@sveltejs/adapter-begin';

export default {
	kit: {
		...
		adapter: begin()
	}
};
```

This adapter expects to find an OpenJS Architect [app.arc](https://arc.codes/) file in the project root. It will use it to determine where to write static assets to based on the `@static` configuration. The default configuration for this file is as follows:

```arc
@app
svelte-kit-app

@http
get /

@static
folder public
```

## Changelog

[The Changelog for this package is available on GitHub](https://github.com/sveltejs/kit/blob/master/packages/adapter-begin/CHANGELOG.md).
