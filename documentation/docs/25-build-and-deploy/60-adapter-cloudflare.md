---
title: Cloudflare
---

To deploy to [Cloudflare Workers](https://workers.cloudflare.com/), use [`adapter-cloudflare`](https://github.com/sveltejs/kit/tree/main/packages/adapter-cloudflare).

This adapter will be installed by default when you use [`adapter-auto`](adapter-auto). If you plan on staying with Cloudflare, you can switch from [`adapter-auto`](adapter-auto) to using this adapter directly so that `cloudflare:workers` is emulated during local development, type declarations are automatically applied, and the ability to set Cloudflare-specific options is provided.

## Comparisons

- `adapter-cloudflare` – supports all SvelteKit features; builds for Cloudflare Workers Static Assets
- `adapter-cloudflare-workers` – deprecated. Supports all SvelteKit features; builds for Cloudflare Workers Sites
- `adapter-static` – only produces client-side static assets; compatible with Cloudflare Workers Static Assets and Cloudflare Pages

## Usage

Run [`npx sv add sveltekit-adapter="adapter:cloudflare"`](/docs/cli/sveltekit-adapter), or install with `npm i -D @sveltejs/adapter-cloudflare` and add the adapter to your `vite.config.js`:

```js
// @errors: 2307
/// file: vite.config.js
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter({
				// See below for an explanation of these options
				config: undefined,
				platformProxy: {
					configPath: undefined,
					environment: undefined,
					persist: undefined
				},
				fallback: 'plaintext'
			})
		})
	]
});
```

## Options

### config

Path to your [Wrangler configuration file](https://developers.cloudflare.com/workers/wrangler/configuration/). If you would like to use a Wrangler configuration filename other than `wrangler.jsonc`, `wrangler.json`, or `wrangler.toml` you can specify it using this option.

### platformProxy

Preferences for the emulated `env` local bindings during development. See the [`getPlatformProxy`](https://developers.cloudflare.com/workers/wrangler/api/#parameters-1) Wrangler API documentation for a full list of options.

### fallback

Whether to render a plaintext 404.html page or a rendered SPA fallback page for non-matching asset requests.

For Cloudflare Workers, the default behaviour is to return a null-body 404-status response for non-matching assets requests. However, if the [`assets.not_found_handling`](https://developers.cloudflare.com/workers/static-assets/routing/#2-not_found_handling) Wrangler configuration setting is set to `"404-page"`, this page will be served if a request fails to match an asset. If `assets.not_found_handling` is set to `"single-page-application"`, the adapter will render a SPA fallback `index.html` page regardless of the `fallback` option specified.

## Basic configuration

When building for Cloudflare Workers, this adapter expects to find a [Wrangler configuration file](https://developers.cloudflare.com/workers/wrangler/configuration/) in the project root. It should look something like this:

```jsonc
/// file: wrangler.jsonc
{
	"name": "<any-name-you-want>",
	"compatibility_flags": ["nodejs_als"],
	"compatibility_date": "<YYYY-MM-DD>"
}
```


## Deployment

You can use the Wrangler CLI to deploy your application by running `npx wrangler deploy` or use the [Cloudflare Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/) to enable automatic builds and deployments on push.

## Runtime APIs

The [`env`](https://developers.cloudflare.com/workers/runtime-apis/fetch-event#parameters) object contains your project's [bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/), which consist of KV/DO namespaces, etc. It is available on the [`cloudflare:workers`](https://developers.cloudflare.com/workers/runtime-apis/bindings/#importing-env-as-a-global) module.

```js
/// file: +server.js
// @filename: ambient.d.ts
declare module 'cloudflare:workers' {
	export const env: {
		YOUR_DURABLE_OBJECT_NAMESPACE: import('@cloudflare/workers-types').DurableObjectNamespace;
	};
}
// @filename: +server.js
// ---cut---
// @errors: 2355 2322
import { env } from 'cloudflare:workers';

/** @type {import('./$types').RequestHandler} */
export async function POST() {
	const x = env.YOUR_DURABLE_OBJECT_NAMESPACE.idFromName('x');
}
```

> [!NOTE] SvelteKit's built-in [`$app/env/*` modules](environment-variables) should be preferred for environment variables.

To make these types available to your app, install [`wrangler`](https://www.npmjs.com/package/wrangler) and run [`wrangler types`](https://developers.cloudflare.com/workers/languages/typescript/).

### Testing locally

`vite dev` runs SvelteKit in Node.js and uses Wrangler's `getPlatformProxy` to emulate Cloudflare-specific values. Local [bindings](https://developers.cloudflare.com/workers/wrangler/configuration/#bindings) are created based on your [Wrangler configuration file](https://developers.cloudflare.com/workers/wrangler/) and populate `env`. Use the adapter's [`platformProxy` option](#Options-platformProxy) to configure these development bindings. Workerd-backed development is not supported.

After running `vite build`, run `vite preview` to serve the built Worker and assets in [workerd](https://github.com/cloudflare/workerd) using the Cloudflare Vite plugin's native preview support. Preview defaults to Vite's port `4173`; use `vite preview --port <port>` to choose another port. Unlike development, preview uses the built Worker's runtime and does not use `platformProxy` options.

> [!NOTE] Durable Objects and Workflows defined in your own Worker require custom class exports, which are not supported by this adapter. You can bind to Durable Objects deployed in a separate Worker.

## Headers and redirects

The [`_headers`](https://developers.cloudflare.com/workers/static-assets/headers/) and [`_redirects`](https://developers.cloudflare.com/workers/static-assets/redirects/) files, specific to Cloudflare, can be used for static asset responses (like images) by putting them into the project root folder.

However, they will have no effect on responses dynamically rendered by SvelteKit, which should return custom headers or redirect responses from [server endpoints](routing#server) or with the [`handle`](hooks#handle) hook.

## Troubleshooting

### Node.js compatibility

If you would like to enable [Node.js compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/), you can add the `nodejs_compat` compatibility flag to your Wrangler configuration file:

```jsonc
/// file: wrangler.jsonc
{
	"compatibility_flags": ["nodejs_compat"]
}
```

### Worker size limits

When deploying your application, the server generated by SvelteKit is bundled into a single file. Wrangler will fail to publish your worker if it exceeds [the size limits](https://developers.cloudflare.com/workers/platform/limits/#worker-size) after minification. You're unlikely to hit this limit usually, but some large libraries can cause this to happen. In that case, you can try to reduce the size of your worker by only importing such libraries on the client side. See [the FAQ](./faq#How-do-I-use-a-client-side-library-accessing-document-or-window) for more information.

### Accessing the file system

You can't use `fs` in Cloudflare Workers.

Instead, use the [`read`]($app-server#read) function from `$app/server` to access your files. It works by fetching the file from the deployed public assets location.

Alternatively, you can [prerender](page-options#prerender) the routes in question.

## Migrating from Workers Sites

Cloudflare no longer recommends using [Workers Sites](https://developers.cloudflare.com/workers/configuration/sites/configuration/) and instead recommends using [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/). To migrate, replace `@sveltejs/adapter-cloudflare-workers` with `@sveltejs/adapter-cloudflare` and remove all `site` configuration settings from your Wrangler configuration file. Remove any `main` setting; the adapter generates the Worker entry. Do not set `assets.directory`, which is managed by the adapter. You can optionally configure `assets.binding` (the default is `ASSETS`):

```js
// @errors: 2307
/// file: vite.config.js
+++import adapter from '@sveltejs/adapter-cloudflare';+++
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			+++adapter: adapter()+++
		})
	]
});
```

### wrangler.toml

```toml
/// file: wrangler.toml
---site.bucket = ".cloudflare/public"---
+++assets.binding = "ASSETS" # Optional; this is the default.+++
```

### wrangler.jsonc

```jsonc
/// file: wrangler.jsonc
{
---	"site": {
		"bucket": ".cloudflare/public"
	},---
+++	"assets": {
		"binding": "ASSETS" // Optional; this is the default.
	}+++
}
```

## Migrating from Cloudflare Pages

`adapter-cloudflare` no longer supports Cloudflare Pages and throws a migration error when running in Pages CI (`CF_PAGES`) or when `pages_build_output_dir` is configured. See Cloudflare's [Workers and Pages compatibility matrix](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/#compatibility-matrix) for a comparison of supported features. To migrate to Cloudflare Workers:

1. Remove `pages_build_output_dir`, `main`, and `assets.directory` from your Wrangler configuration. Follow [Basic configuration](#Basic-configuration); the adapter manages the Worker entry and assets directory.
2. Remove the adapter's `routes` option and any `_routes.json` files. Workers Static Assets handles asset routing without them; see [Cloudflare's routing documentation](https://developers.cloudflare.com/workers/static-assets/routing/).
3. Replace `wrangler pages dev` with `vite preview` and replace `wrangler pages deploy` with `wrangler deploy`. For automatic deployments, use [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) instead of the Pages Git integration.

You can keep using `_headers` and `_redirects` files in the project root. If you only need a static site on Cloudflare Pages, use [`adapter-static`](adapter-static) instead.
