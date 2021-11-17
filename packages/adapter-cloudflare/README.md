# adapter-cloudflare

[Adapter](https://kit.svelte.dev/docs#adapters) for building SvelteKit
applications on Cloudflare Pages with Workers integration.

_**Comparisons**_

- `adapter-cloudflare` – supports all SvelteKit features; builds for
  [Cloudflare Pages](https://blog.cloudflare.com/cloudflare-pages-goes-full-stack/)
- `adapter-cloudflare-workers` – supports all SvelteKit features; builds for
  Cloudflare Workers
- `adapter-static` – only produces client-side static assets; compatible with
  Cloudflare Pages

## Installation

```sh
$ npm i --save-dev @sveltejs/adapter-cloudflare@next
```

## Usage

You can include these changes in your `svelte.config.js` configuration file:

```js
import cloudflare from '@sveltejs/adapter-cloudflare';

export default {
	kit: {
		target: '#svelte',
		adapter: cloudflare({
			// any esbuild options
		})
	}
};
```

## Options

The adapter optionally accepts all
[`esbuild.build`](https://esbuild.github.io/api/#build-api) configuration.

These are the default options, of which, all but `target` and `platform` are
enforced:

```js
target: 'es2020',
platform: 'browser',
entryPoints: '< input >',
outfile: '<output>/_worker.js',
allowOverwrite: true,
format: 'esm',
bundle: true,
```

## Changelog

[The Changelog for this package is available on
GitHub](https://github.com/sveltejs/kit/blob/master/packages/adapter-cloudflare/CHANGELOG.md).
