---
title: Cloudflare
---

To deploy to [Cloudflare Workers](https://workers.cloudflare.com/), use [`adapter-cloudflare`](https://github.com/sveltejs/kit/tree/main/packages/adapter-cloudflare).

This adapter will be installed by default when you use [`adapter-auto`](adapter-auto). If you plan on staying with Cloudflare Workers, you can switch from [`adapter-auto`](adapter-auto) to using this adapter directly so that `event.platform` is emulated during local development, type declarations are automatically applied, and the ability to set Cloudflare-specific options is provided.

## Comparisons

- `adapter-cloudflare` – supports all SvelteKit features; builds for Cloudflare Workers Static Assets
- `adapter-cloudflare-workers` – deprecated. Supports all SvelteKit features; builds for Cloudflare Workers Sites
- `adapter-static` – only produces client-side static assets; compatible with Cloudflare Workers Static Assets and Cloudflare Pages

## Usage

Install with `npm i -D @sveltejs/adapter-cloudflare`, then add the adapter to your `svelte.config.js`:

```js
/// file: svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter()
	}
};

export default config;
```

And also to your `vite.config.js`:

```js
/// file: vite.config.js
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter({
				// See below for an explanations of these options
				vitePluginOptions: undefined
			})
		})
	]
});
```

## Options

### vitePluginOptions

// TODO:

## Customising your worker

You can customise your worker by creating a new file and specifying the path to it in your [Wrangler configuration file](https://developers.cloudflare.com/workers/configuration/sites/configuration/).

```jsonc
/// file: wrangler.jsonc
{
	"main": "src/worker.js",
}
```

Inside your worker file, you can reproduce the SvelteKit request handling behaviour by importing the `fetch` method from `@sveltejs/adapter-cloudflare/worker`.

```js
/// file: src/worker.js
import { fetch } from '@sveltejs/adapter-cloudflare/worker';

export default {
	fetch
	// Add other types of handlers here
}
```

## Deployment

You can use the Wrangler CLI to deploy your application by running `npx wrangler deploy` or use the [Cloudflare Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/) to enable automatic builds and deployments on push.

## Runtime APIs

The [`env`](https://developers.cloudflare.com/workers/runtime-apis/fetch-event#parameters) object contains your project's [bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/), which consist of KV/DO namespaces, etc. It is passed to SvelteKit via the `platform` property, along with [`ctx`](https://developers.cloudflare.com/workers/runtime-apis/context/), [`caches`](https://developers.cloudflare.com/workers/runtime-apis/cache/), and [`cf`](https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties) meaning that you can access it in hooks and endpoints:

```js
// @filename: ambient.d.ts
import { DurableObjectNamespace } from '@cloudflare/workers-types';

declare global {
	namespace App {
		interface Platform {
			env: {
				YOUR_DURABLE_OBJECT_NAMESPACE: DurableObjectNamespace;
			};
		}
	}
}
// @filename: +server.js
// ---cut---
// @errors: 2355 2322
/// file: +server.js
/** @type {import('./$types').RequestHandler} */
export async function POST({ request, platform }) {
	const x = platform?.env.YOUR_DURABLE_OBJECT_NAMESPACE.idFromName('x');
}
```

> [!NOTE] SvelteKit's built-in [`$env` module]($env-static-private) should be preferred for environment variables.

After configuring the bindings in your Wrangler configuration file, you can make the types available by running [`npx wrangler types`](https://developers.cloudflare.com/workers/languages/typescript/) and referencing the `Env` type in your `src/app.d.ts`:

```ts
/// file: src/app.d.ts
+++import { Env } from '../worker-configuration.d.ts';+++

declare global {
	namespace App {
		interface Platform {
+++			env: Env;+++
		}
	}
}

export {};
```

### Testing locally

Cloudflare specific values in the `platform` property are emulated during dev and preview modes through [Cloudflare's Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/). [Bindings](https://developers.cloudflare.com/workers/wrangler/configuration/#bindings) are created based on your [Wrangler configuration file](https://developers.cloudflare.com/workers/wrangler/) and are used to populate `platform.env`.

## Headers and redirects

The [`_headers`](https://developers.cloudflare.com/pages/configuration/headers/) and [`_redirects`](https://developers.cloudflare.com/pages/configuration/redirects/) files, specific to Cloudflare, can be used for static asset responses (like images) by putting them into the project root folder.

However, they will have no effect on responses dynamically rendered by SvelteKit, which should return custom headers or redirect responses from [server endpoints](routing#server) or with the [`handle`](hooks#Server-hooks-handle) hook.

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

## Migrating from Pages

TODO:

## Migrating from Workers Sites

Cloudflare no longer recommends using [Workers Sites](https://developers.cloudflare.com/workers/configuration/sites/configuration/) and instead recommends using [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/). To migrate, replace `@sveltejs/adapter-cloudflare-workers` with `@sveltejs/adapter-cloudflare` and remove all `site` configuration settings from your Wrangler configuration file, then add the `assets.directory` and `assets.binding` configuration settings:

### svelte.config.js

```js
// @errors: 2307
/// file: svelte.config.js
---import adapter from '@sveltejs/adapter-cloudflare-workers';---
+++import adapter from '@sveltejs/adapter-cloudflare';+++

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter()
	}
};

export default config;
```

### wrangler.toml

```toml
/// file: wrangler.toml
---site.bucket = ".cloudflare/public"---
+++assets.directory = ".cloudflare/public"
assets.binding = "ASSETS" # Exclude this if you don't have a `main` key configured.+++
```

### wrangler.jsonc

```jsonc
/// file: wrangler.jsonc
{
---	"site": {
		"bucket": ".cloudflare/public"
	},---
+++	"assets": {
		"directory": ".cloudflare/public",
		"binding": "ASSETS" // Exclude this if you don't have a `main` key configured.
	}+++
}
```
