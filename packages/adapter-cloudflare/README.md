# adapter-cloudflare

[Adapter](https://kit.svelte.dev/docs/adapters) for building SvelteKit applications on [Cloudflare Pages](https://developers.cloudflare.com/pages/) with [Workers integration](https://developers.cloudflare.com/pages/platform/functions).

If you're using [adapter-auto](../adapter-auto), you don't need to install this — it's already included.

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
import adapter from '@sveltejs/adapter-cloudflare';

export default {
	kit: {
		adapter: adapter()
	}
};
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

## Environment variables

The [`env`](https://developers.cloudflare.com/workers/runtime-apis/fetch-event#parameters) object, containing KV namespaces etc, is passed to SvelteKit via the `platform` property, meaning you can access it in hooks and endpoints:

```diff
// src/app.d.ts
declare namespace App {
	interface Locals {}

+	interface Platform {
+		env: {
+			COUNTER: DurableObjectNamespace;
+		};
+	}

	interface Session {}

	interface Stuff {}
}
```

```js
export async function post({ request, platform }) {
	const counter = platform.env.COUNTER.idFromName('A');
}
```

> `platform.env` is only available in the production build. Use [wrangler](https://developers.cloudflare.com/workers/cli-wrangler) to test it locally

## Changelog

[The Changelog for this package is available on GitHub](https://github.com/sveltejs/kit/blob/master/packages/adapter-cloudflare/CHANGELOG.md).
