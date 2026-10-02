---
title: Cloudflare
---

To deploy to [Cloudflare Workers](https://workers.cloudflare.com/), use [`adapter-cloudflare`](https://github.com/sveltejs/kit/tree/main/packages/adapter-cloudflare).

This adapter will be installed by default when you use [`adapter-auto`](adapter-auto). If you plan on staying with Cloudflare, you can switch from [`adapter-auto`](adapter-auto) to using this adapter directly so that `event.platform` is emulated during local development, type declarations are automatically applied, and the ability to set Cloudflare-specific options is provided.

## Comparisons

- `adapter-cloudflare` – supports all SvelteKit features; builds for Cloudflare Workers Static Assets
- `adapter-cloudflare-workers` – deprecated. Supports all SvelteKit features; builds for Cloudflare Workers Sites
- `adapter-static` – only produces client-side static assets; compatible with Cloudflare Workers Static Assets and Cloudflare Pages

## Usage

Install with `npm i -D @sveltejs/adapter-cloudflare`, then add the adapter to your `vite.config.js`:

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

Preferences for the emulated `platform.env` local bindings. See the [getPlatformProxy](https://developers.cloudflare.com/workers/wrangler/api/#parameters-1) Wrangler API documentation for a full list of options.

### fallback

Whether to render a plaintext 404.html page or a rendered SPA fallback page for non-matching asset requests.

The default behaviour is to return a null-body 404-status response for non-matching assets requests. However, if the [`assets.not_found_handling`](https://developers.cloudflare.com/workers/static-assets/routing/#2-not_found_handling) Wrangler configuration setting is set to `"404-page"`, this page will be served if a request fails to match an asset. If `assets.not_found_handling` is set to `"single-page-application"`, the adapter will render a SPA fallback `index.html` page regardless of the `fallback` option specified.

## Basic configuration

When building for Cloudflare Workers, this adapter expects to find a [Wrangler configuration file](https://developers.cloudflare.com/workers/configuration/sites/configuration/) in the project root. It should look something like this:

```jsonc
/// file: wrangler.jsonc
{
	"name": "<any-name-you-want>",
	"main": ".svelte-kit/cloudflare/_worker.js",
	"compatibility_flags": ["nodejs_als"],
	"compatibility_date": "<YYYY-MM-DD>",
	"assets": {
		"binding": "ASSETS",
		"directory": ".svelte-kit/cloudflare",
	}
}
```

## Deployment

You can use [Wrangler](https://developers.cloudflare.com/workers/wrangler/) to deploy your application by running `npx wrangler deploy` or use the [Cloudflare Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/) to enable automatic builds and deployments on push.

## Runtime APIs

The [`env`](https://developers.cloudflare.com/workers/runtime-apis/fetch-event#parameters) object contains your project's [bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/), which consist of KV/DO namespaces, etc. It is passed to SvelteKit via the `platform` property, along with [`ctx`](https://developers.cloudflare.com/workers/runtime-apis/context/), [`caches`](https://developers.cloudflare.com/workers/runtime-apis/cache/), and [`cf`](https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties), meaning that you can access it in hooks and endpoints:

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

> [!NOTE] SvelteKit's built-in [`$app/env/*` modules](environment-variables) should be preferred for environment variables.

After configuring the bindings in your Wrangler configuration file, you can add type-safety by running [`npx wrangler types`](https://developers.cloudflare.com/workers/languages/typescript/) and adding the generated types to your `tsconfig.json`.

```json
/// file: tsconfig.json
{
	"compilerOptions": {
		+++"types": ["worker-configuration.d.ts"]+++
	}
}
```

Finally, add `Env` to the `platform.env` property in `src/app.d.ts`:

```ts
// @errors: 2304
/// file: src/app.d.ts
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

Cloudflare specific values in the `platform` property are emulated during dev and preview modes. Local [bindings](https://developers.cloudflare.com/workers/wrangler/configuration/#bindings) are created based on your [Wrangler configuration file](https://developers.cloudflare.com/workers/wrangler/) and are used to populate `platform.env` during development and preview. Use the adapter config [`platformProxy` option](#Options-platformProxy) to change your preferences for the bindings.

For testing the build, you should use [Wrangler](https://developers.cloudflare.com/workers/wrangler/) version 4. Once you have built your site, run `wrangler dev .svelte-kit/cloudflare/_worker.js`.

## Headers and redirects

The [`_headers`](https://developers.cloudflare.com/pages/configuration/headers/) and [`_redirects`](https://developers.cloudflare.com/pages/configuration/redirects/) files, specific to Cloudflare, can be used for static asset responses (like images) by putting them into the project root folder.

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

## Migrating from Pages

Cloudflare Workers is now preferred over Pages because of its broader feature set. You should follow the [official migration guide](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/) to redeploy your project to Workers before deleting your Pages project.

## Migrating from Workers Sites

Cloudflare no longer recommends using [Workers Sites](https://developers.cloudflare.com/workers/configuration/sites/configuration/) and instead recommends using [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/). To migrate, replace `@sveltejs/adapter-cloudflare-workers` with `@sveltejs/adapter-cloudflare` and remove all `site` configuration settings from your Wrangler configuration file, then add the `assets.directory` and `assets.binding` configuration settings:

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
