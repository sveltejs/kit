# adapter-cloudflare-workers

SvelteKit adapter that creates a Cloudflare Workers site using a function for dynamic server rendering.

**Requires [Wrangler v2](https://developers.cloudflare.com/workers/wrangler/get-started/).** Wrangler v1 is no longer supported.

_**Comparisons**_

- `adapter-cloudflare` – supports all SvelteKit features; builds for
  [Cloudflare Pages](https://blog.cloudflare.com/cloudflare-pages-goes-full-stack/)
- `adapter-cloudflare-workers` – supports all SvelteKit features; builds for
  Cloudflare Workers
- `adapter-static` – only produces client-side static assets; compatible with
  Cloudflare Pages

> **Note:** Cloudflare Pages' new Workers integration is currently in beta.<br/>
> Compared to `adapter-cloudflare-workers`, `adapter-cloudflare` is the preferred approach for most users since building on top of Pages unlocks automatic builds and deploys, preview deployments, instant rollbacks, etc.<br/>
> From SvelteKit's perspective, there is no difference and no functionality loss when migrating to/from the Workers and the Pages adapters.

## Usage

Install with `npm i -D @sveltejs/adapter-cloudflare-workers`, then add the adapter to your `svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-cloudflare-workers';

export default {
  kit: {
    adapter: adapter()
  }
};
```

## Basic Configuration

This adapter expects to find a [wrangler.toml](https://developers.cloudflare.com/workers/platform/sites/configuration) file in the project root. It should look something like this:

```toml
name = "<your-service-name>"
account_id = "<your-account-id>"

main = "./.cloudflare/worker.js"
site.bucket = "./.cloudflare/public"

build.command = "npm run build"

compatibility_date = "2021-11-12"
workers_dev = true
```

`<your-service-name>` can be anything. `<your-account-id>` can be found by logging into your [Cloudflare dashboard](https://dash.cloudflare.com) and grabbing it from the end of the URL:

```
https://dash.cloudflare.com/<your-account-id>
```

> It's recommended that you add the `.cloudflare` directory (or whichever directories you specified for `main` and `site.bucket`) to your `.gitignore`.

You will need to install [wrangler](https://developers.cloudflare.com/workers/wrangler/get-started/) and log in, if you haven't already:

```
npm i -g wrangler
wrangler login
```

Then, you can build your app and deploy it:

```sh
wrangler publish
```

## Environment variables

The [`env`](https://developers.cloudflare.com/workers/runtime-apis/fetch-event#parameters) object, containing KV/DO namespaces etc, is passed to SvelteKit via the `platform` property along with `context` and `caches`, meaning you can access it in hooks and endpoints:

```js
export async function POST({ request, platform }) {
  const x = platform.env.YOUR_DURABLE_OBJECT_NAMESPACE.idFromName('x');
}
```

To make these types available to your app, reference them in your `src/app.d.ts`:

```diff
/// <reference types="@sveltejs/kit" />
+/// <reference types="@sveltejs/adapter-cloudflare-workers" />

declare namespace App {
	interface Platform {
+		env?: {
+			YOUR_KV_NAMESPACE: KVNamespace;
+			YOUR_DURABLE_OBJECT_NAMESPACE: DurableObjectNamespace;
+		};
	}
}
```

> `platform.env` is only available in the production build. Use [wrangler](https://developers.cloudflare.com/workers/cli-wrangler) to test it locally

## Changelog

[The Changelog for this package is available on GitHub](https://github.com/sveltejs/kit/blob/master/packages/adapter-cloudflare-workers/CHANGELOG.md).
