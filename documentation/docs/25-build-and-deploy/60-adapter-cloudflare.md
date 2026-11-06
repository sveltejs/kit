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
				platformProxy: {
					persist: undefined,
					remoteBindings: undefined
				},
				fallback: 'plaintext'
			})
		})
	]
});
```

Your Worker is configured with a `cloudflare.config.ts` file in the root of your project. The adapter generates the Worker's `entrypoint`, unless you [write your own](#Custom-Worker), and adds an `assets` binding named `ASSETS` if you haven't declared one, so you only need to declare its name, compatibility date and any bindings:

```ts
/// file: cloudflare.config.ts
// @errors: 2307
import { bindings, defineConfig } from '@cloudflare/config';

export default defineConfig({
	worker: {
		name: 'my-app',
		compatibilityDate: '2026-11-01',
		env: {
			MY_KV: bindings.kv()
		}
	}
});
```

## Options

### platformProxy

Preferences for the emulated `env` local bindings during development, which are passed to `getPlatformProxy` from `@cloudflare/platform-proxy`. The bindings are read from `cloudflare.config.ts` using the current [Vite mode](https://vite.dev/guide/env-and-mode#modes).

### fallback

Whether to render a plaintext 404.html page or a rendered SPA fallback page for non-matching asset requests.

For Cloudflare Workers, the default behaviour is to return a null-body 404-status response for non-matching assets requests. However, if the [`assets.notFoundHandling`](https://developers.cloudflare.com/workers/static-assets/routing/#2-not_found_handling) setting in `cloudflare.config.ts` is set to `"404-page"`, this page will be served if a request fails to match an asset. If `assets.notFoundHandling` is set to `"single-page-application"`, the adapter will render a SPA fallback `index.html` page regardless of the `fallback` option specified.

## Deployment

The adapter writes your Worker and its static assets to `.cloudflare/output`. You can deploy it with the Cloudflare CLI by running `npx cf deploy` or use the [Cloudflare Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/) to enable automatic builds and deployments on push.

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

Types for your bindings are generated in `.cloudflare/types/index.d.ts` whenever you run `vite dev` or `vite build`.

### Testing locally

Cloudflare specific values are emulated during development. Local [bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/) are created based on your `cloudflare.config.ts` file and are used to populate `env` during development. Values for secrets are read from a `.dev.vars` or `.env` file. Use the adapter config [`platformProxy` option](#Options-platformProxy) to change your preferences for the bindings.

Once you have built your site, run `vite preview` to test the built Worker in Cloudflare's local `workerd` runtime.

## Custom Worker

To export [Durable Objects](https://developers.cloudflare.com/durable-objects/), [Workflows](https://developers.cloudflare.com/workflows/) or other handlers such as `scheduled` and `queue` from your Worker, point `entrypoint` in `cloudflare.config.ts` to your own Worker and call SvelteKit's request handler from its `fetch` handler:

```ts
/// file: cloudflare.config.ts
// @errors: 2307
import { bindings, defineConfig, exports } from '@cloudflare/config';

export default defineConfig({
	worker: {
		name: 'my-app',
		compatibilityDate: '2026-11-01',
		entrypoint: './src/worker.ts',
		exports: {
			Counter: exports.durableObject({ storage: 'sqlite' })
		},
		env: {
			COUNTER: bindings.durableObject({ worker: 'my-app', exportName: 'Counter' })
		}
	}
});
```

```ts
/// file: src/worker.ts
// @errors: 2307
import { DurableObject } from 'cloudflare:workers';
import { fetch } from '@sveltejs/adapter-cloudflare/worker';

export class Counter extends DurableObject {}

export default {
	fetch,
	async scheduled() {
		// ...
	}
};
```

During development, your Worker runs in Cloudflare's local `workerd` runtime and receives requests first. Its call to SvelteKit's `fetch` handler sends the request back to SvelteKit, which runs in Node so that it can use Vite's hot module replacement. Both share the same bindings, but not module-level state, since that isn't shared between Worker isolates in production either.

## Migrating from Wrangler configuration files

The adapter no longer reads `wrangler.jsonc`, `wrangler.json` or `wrangler.toml` files. Follow Cloudflare's [Wrangler migration guide](https://developers.cloudflare.com/cf/wrangler/migrate/), passing `--bundler vite` to `npx cf migrate` so that it generates a `cloudflare.config.ts` file for the Cloudflare Vite plugin, then:

- remove the adapter's `config` option
- remove the Worker's `entrypoint` from `cloudflare.config.ts` if it points to `.svelte-kit/cloudflare/_worker.js`, since the adapter generates it
- replace `wrangler deploy` with `cf deploy`

## Headers and redirects

The [`_headers`](https://developers.cloudflare.com/workers/static-assets/headers/) and [`_redirects`](https://developers.cloudflare.com/workers/static-assets/redirects/) files, specific to Cloudflare, can be used for static asset responses (like images) by putting them into the project root folder.

However, they will have no effect on responses dynamically rendered by SvelteKit, which should return custom headers or redirect responses from [server endpoints](routing#server) or with the [`handle`](hooks#handle) hook.

## Troubleshooting

### Worker size limits

Deploying your application will fail if your Worker files exceed [the size limits](https://developers.cloudflare.com/workers/platform/limits/#worker-size) after minification. You're unlikely to hit this limit usually, but some large libraries can cause this to happen. In that case, you can try to reduce the size of your worker by only importing such libraries on the client side. See [the FAQ](./faq#How-do-I-use-a-client-side-library-accessing-document-or-window) for more information.

### Accessing the file system

You can't use `fs` in Cloudflare Workers.

Instead, use the [`read`]($app-server#read) function from `$app/server` to access your files. It works by fetching the file from the deployed public assets location.

Alternatively, you can [prerender](page-options#prerender) the routes in question.

## Migrating from Workers Sites

Cloudflare no longer recommends using [Workers Sites](https://developers.cloudflare.com/workers/configuration/sites/configuration/) and instead recommends using [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/). To migrate, replace `@sveltejs/adapter-cloudflare-workers` with `@sveltejs/adapter-cloudflare` and [migrate your Wrangler configuration file](#Migrating-from-Wrangler-configuration-files) without its `site` settings.

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

## Migrating from Cloudflare Pages

To migrate to Cloudflare Workers:

1. Remove `pages_build_output_dir` from your Wrangler configuration and [migrate it to `cloudflare.config.ts`](#Migrating-from-Wrangler-configuration-files).
2. Remove the adapter's `routes` option and any `_routes.json` files.
3. Replace `wrangler pages dev` with `vite preview`, and replace `wrangler pages deploy` with `cf deploy`. For automatic deployments, use [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) instead of the Pages Git integration.

See Cloudflare's [Workers and Pages compatibility matrix](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/#compatibility-matrix) for a comparison of supported features.
