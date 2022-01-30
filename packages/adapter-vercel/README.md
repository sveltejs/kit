# adapter-vercel

Allow SvelteKit applications to adapt to Vercel's serverless environment, with support for both static files and server-rendering.

## Usage

You do not need to install this package manually. It is automatically installed through `@sveltejs/adapter-auto`.

1. `npm i -D @sveltejs/adapter-auto`.
2. Update your `svelte.config.js` as shown below.

```js
import adapter from "@sveltejs/adapter-auto";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),

    // hydrate the <div id="svelte"> element in src/app.html
    target: "#svelte",
  },
};

export default config;
```

## Changelog

[The Changelog for this package is available on GitHub](https://github.com/sveltejs/kit/blob/master/packages/adapter-vercel/CHANGELOG.md).
