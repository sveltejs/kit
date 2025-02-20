---
title: Cloudflare Workers
---

To deploy to [Cloudflare Workers](https://workers.cloudflare.com/), use [`adapter-cloudflare-workers`](https://github.com/sveltejs/kit/tree/main/packages/adapter-cloudflare-workers).

> [!NOTE] Unless you have a specific reason to use `adapter-cloudflare-workers`, it's recommended that you use `adapter-cloudflare` instead. Both adapters have equivalent functionality, but Cloudflare Pages offers features like GitHub integration with automatic builds and deploys, preview deployments, instant rollback and so on.

## Usage

Install with `npm i -D @sveltejs/adapter-cloudflare-workers`, then add the adapter to your `svelte.config.js`:

```js
// @errors: 2307
/// file: svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare-workers';

export default {
	kit: {
		adapter: adapter({
			// see below for options that can be set here
		})
	}
};
```

## Options

### config

Path to your [Wrangler configuration file](https://developers.cloudflare.com/workers/wrangler/configuration/). If you would like to use a Wrangler configuration filename other than `wrangler.jsonc`, you can specify it using this option.

### platformProxy

Preferences for the emulated `platform.env` local bindings. See the [getPlatformProxy](https://developers.cloudflare.com/workers/wrangler/api/#syntax) Wrangler API documentation for a full list of options.

## Basic Configuration

This adapter expects to find a [Wrangler configuration file](https://developers.cloudflare.com/workers/platform/sites/configuration) in the project root. It should look something like this:

```jsonc
/// file: wrangler.jsonc
{
	"name": "<your-service-name>",
	"account_id": "<your-account-id>",
	"main": "./.cloudflare/worker.js",
	"site": {
		"bucket": "./.cloudflare/public"
	},
	"build": {
		"command": "npm run build"
	},
	"compatibility_date": "2021-11-12"
}
```

`<your-service-name>` can be anything. `<your-account-id>` can be found by running `wrangler whoami` using the Wrangler CLI tool or by logging into your [Cloudflare dashboard](https://dash.cloudflare.com) and grabbing it from the end of the URL:

```
https://dash.cloudflare.com/<your-account-id>/home
```

> [!NOTE] You should add the `.cloudflare` directory (or whichever directories you specified for `main` and `site.bucket`) and the `.wrangler` directory to your `.gitignore`.

You will need to install [Wrangler](https://developers.cloudflare.com/workers/wrangler/get-started/) and log in, if you haven't already:

```sh
npm i -D wrangler
wrangler login
```

Then, you can build your app and deploy it:

```sh
wrangler deploy
```

## Runtime APIs

The [`env`](https://developers.cloudflare.com/workers/runtime-apis/fetch-event#parameters) object contains your project's [bindings](https://developers.cloudflare.com/pages/platform/functions/bindings/), which consist of KV/DO namespaces, etc. It is passed to SvelteKit via the `platform` property, along with [`context`](https://developers.cloudflare.com/workers/runtime-apis/handlers/fetch/#contextwaituntil), [`caches`](https://developers.cloudflare.com/workers/runtime-apis/cache/), and [`cf`](https://developers.cloudflare.com/workers/runtime-apis/request/#the-cf-property-requestinitcfproperties), meaning that you can access it in hooks and endpoints:

```js
// @errors: 7031
export async function POST({ request, platform }) {
	const x = platform.env.YOUR_DURABLE_OBJECT_NAMESPACE.idFromName('x');
}
```

> [!NOTE] SvelteKit's built-in `$env` module should be preferred for environment variables.

To make these types available to your app, install `@cloudflare/workers-types` and reference them in your `src/app.d.ts`:

```ts
/// file: src/app.d.ts
+++import { KVNamespace, DurableObjectNamespace } from '@cloudflare/workers-types';+++

declare global {
	namespace App {
		interface Platform {
+++			env?: {
				YOUR_KV_NAMESPACE: KVNamespace;
				YOUR_DURABLE_OBJECT_NAMESPACE: DurableObjectNamespace;
			};+++
		}
	}
}

export {};
```

### Testing Locally

Cloudflare Workers specific values in the `platform` property are emulated during dev and preview modes. Local [bindings](https://developers.cloudflare.com/workers/wrangler/configuration/#bindings) are created based on your [Wrangler configuration file](https://developers.cloudflare.com/workers/wrangler/) and are used to populate `platform.env` during development and preview. Use the adapter config [`platformProxy` option](#Options-platformProxy) to change your preferences for the bindings.

For testing the build, you should use [Wrangler](https://developers.cloudflare.com/workers/wrangler/) **version 3**. Once you have built your site, run `wrangler dev`.

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

You can't use `fs` in Cloudflare Workers — you must [prerender](page-options#prerender) the routes in question.
