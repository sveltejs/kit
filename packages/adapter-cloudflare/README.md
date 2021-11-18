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

> **Note:** Cloudflare Pages' new Workers integration is currently in beta.<br/>
> Compared to `adapter-cloudflare-workers`, this adapter will be the preferred approach for most users since building on top of Pages unlocks automatic builds and deploys, preview deployments, instant rollbacks, etc.<br/>
> From SvelteKit's perspective, there is no difference and no functionality loss when migrating to/from the Workers and the Pages adapters.

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

### Options

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

## Deployment

Please follow the [Get Started Guide](https://developers.cloudflare.com/pages/get-started) for Cloudflare Pages to begin.

When configuring your project settings, you must use the following settings:

- **Framework preset** – None
- **Build command** – `npm run build` or `svelte-kit build`
- **Build output directory** – `.svelte-kit/cloudflare`
- **Environment variables**
  - `NODE_VERSION`: `16` or `14`

> **Important:** You need to add a `NODE_VERSION` environment variable to both the "production" and "preview" environments. You can add this during project setup or later in the Pages project settings. SvelteKit requires Node `14.13` or later, so you should use `14` or `16` as the `NODE_VERSION` value.

## Changelog

[The Changelog for this package is available on
GitHub](https://github.com/sveltejs/kit/blob/master/packages/adapter-cloudflare/CHANGELOG.md).
