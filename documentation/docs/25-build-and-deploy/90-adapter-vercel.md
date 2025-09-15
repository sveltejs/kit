---
title: Vercel
---

To deploy to Vercel, use [`adapter-vercel`](https://github.com/sveltejs/kit/tree/main/packages/adapter-vercel).

This adapter will be installed by default when you use [`adapter-auto`](adapter-auto), but adding it to your project allows you to specify Vercel-specific options.

## Usage

Install with `npm i -D @sveltejs/adapter-vercel`, then add the adapter to your `svelte.config.js`:

```js
/// file: svelte.config.js
import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// see below for options that can be set here
		})
	}
};

export default config;
```

## Deployment configuration

To control how your routes are deployed to Vercel as functions, you can specify deployment configuration, either through the option shown above or with [`export const config`](page-options#config) inside `+server.js`, `+page(.server).js` and `+layout(.server).js` files.

For example you could deploy one specific route as an individual serverless function, separate from the rest of your app:

```js
/// file: about/+page.js
/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
	split: true
};
```

The following options apply to all functions:

- `runtime`: `'edge'`, `'nodejs18.x'`, `'nodejs20.x'` or `'nodejs22.x'`. By default, the adapter will select the `'nodejs<version>.x'` corresponding to the Node version your project is configured to use on the Vercel dashboard
  > [!NOTE] This option is deprecated and will be removed in a future version, at which point all your functions will use whichever Node version is specified in the project configuration on Vercel
- `regions`: an array of [edge network regions](https://vercel.com/docs/concepts/edge-network/regions) (defaulting to `["iad1"]` for serverless functions) or `'all'` if `runtime` is `edge` (its default). Note that multiple regions for serverless functions are only supported on Enterprise plans
- `split`: if `true`, causes a route to be deployed as an individual function. If `split` is set to `true` at the adapter level, all routes will be deployed as individual functions

Additionally, the following option applies to edge functions:
- `external`: an array of dependencies that esbuild should treat as external when bundling functions. This should only be used to exclude optional dependencies that will not run outside Node

And the following option apply to serverless functions:
- `memory`: the amount of memory available to the function. Defaults to `1024` Mb, and can be decreased to `128` Mb or [increased](https://vercel.com/docs/concepts/limits/overview#serverless-function-memory) in 64Mb increments up to `3008` Mb on Pro or Enterprise accounts
- `maxDuration`: [maximum execution duration](https://vercel.com/docs/functions/runtimes#max-duration) of the function. Defaults to `10` seconds for Hobby accounts, `15` for Pro and `900` for Enterprise
- `isr`: configuration Incremental Static Regeneration, described below

Configuration set in a layout applies to all the routes beneath that layout, unless overridden at a more granular level.

If your functions need to access data in a specific region, it's recommended that they be deployed in the same region (or close to it) for optimal performance.

## Image Optimization

You may set the `images` config to control how Vercel builds your images. See the [image configuration reference](https://vercel.com/docs/build-output-api/v3/configuration#images) for full details. As an example, you may set:

```js
/// file: svelte.config.js
import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			images: {
				sizes: [640, 828, 1200, 1920, 3840],
				formats: ['image/avif', 'image/webp'],
				minimumCacheTTL: 300,
				domains: ['example-app.vercel.app'],
			}
		})
	}
};

export default config;
```

## Incremental Static Regeneration

Vercel supports [Incremental Static Regeneration](https://vercel.com/docs/incremental-static-regeneration) (ISR), which provides the performance and cost advantages of prerendered content with the flexibility of dynamically rendered content.

> [!NOTE] Use ISR only on routes where every visitor should see the same content (much like when you prerender). If there's anything user-specific happening (like session cookies), they should happen on the client via JavaScript only to not leak sensitive information across visits

To add ISR to a route, include the `isr` property in your `config` object:

```js
import { BYPASS_TOKEN } from '$env/static/private';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
	isr: {
		expiration: 60,
		bypassToken: BYPASS_TOKEN,
		allowQuery: ['search']
	}
};
```

> [!NOTE] Using ISR on a route with `export const prerender = true` will have no effect, since the route is prerendered at build time

The `expiration` property is required; all others are optional. The properties are discussed in more detail below.

### expiration

The expiration time (in seconds) before the cached asset will be re-generated by invoking the Serverless Function. Setting the value to `false` means it will never expire. In that case, you likely want to define a bypass token to re-generate on demand.

### bypassToken

A random token that can be provided in the URL to bypass the cached version of the asset, by requesting the asset with a `__prerender_bypass=<token>` cookie.

Making a `GET` or `HEAD` request with `x-prerender-revalidate: <token>` will force the asset to be re-validated.

Note that the `BYPASS_TOKEN` string must be at least 32 characters long. You could generate one using the JavaScript console like so:

```js
crypto.randomUUID();
```

Set this string as an environment variable on Vercel by logging in and going to your project then Settings > Environment Variables. For "Key" put `BYPASS_TOKEN` and for "value" use the string generated above, then hit "Save".

To get this key known about for local development, you can use the [Vercel CLI](https://vercel.com/docs/cli/env) by running the `vercel env pull` command locally like so:

```sh
vercel env pull .env.development.local
```

### allowQuery

A list of valid query parameters that contribute to the cache key. Other parameters (such as utm tracking codes) will be ignored, ensuring that they do not result in content being re-generated unnecessarily. By default, query parameters are ignored.

> [!NOTE] Pages that are  [prerendered](page-options#prerender) will ignore ISR configuration.

## Environment variables

Vercel makes a set of [deployment-specific environment variables](https://vercel.com/docs/concepts/projects/environment-variables#system-environment-variables) available. Like other environment variables, these are accessible from `$env/static/private` and `$env/dynamic/private` (sometimes — more on that later), and inaccessible from their public counterparts. To access one of these variables from the client:

```js
/// file: +layout.server.js
import { VERCEL_COMMIT_REF } from '$env/static/private';

/** @type {import('./$types').LayoutServerLoad} */
export function load() {
	return {
		deploymentGitBranch: VERCEL_COMMIT_REF
	};
}
```

```svelte
<!--- file: +layout.svelte --->
<script>
	/** @type {import('./$types').LayoutProps} */
	let { data } = $props();
</script>

<p>This staging environment was deployed from {data.deploymentGitBranch}.</p>
```

Since all of these variables are unchanged between build time and run time when building on Vercel, we recommend using `$env/static/private` — which will statically replace the variables, enabling optimisations like dead code elimination — rather than `$env/dynamic/private`.

## Skew protection

When a new version of your app is deployed, assets belonging to the previous version may no longer be accessible. If a user is actively using your app when this happens, it can cause errors when they navigate — this is known as _version skew_. SvelteKit mitigates this by detecting errors resulting from version skew and causing a hard reload to get the latest version of the app, but this will cause any client-side state to be lost. (You can also proactively mitigate it by observing [`updated.current`]($app-state#updated) from `$app/state`, which tells clients when a new version has been deployed.)

[Skew protection](https://vercel.com/docs/deployments/skew-protection) is a Vercel feature that routes client requests to their original deployment. When a user visits your app, a cookie is set with the deployment ID, and any subsequent requests will be routed to that deployment for as long as skew protection is active. When they reload the page, they will get the newest deployment. (`updated.current` is exempted from this behaviour, and so will continue to report new deployments.) To enable it, visit the Advanced section of your project settings on Vercel.

Cookie-based skew protection comes with one caveat: if a user has multiple versions of your app open in multiple tabs, requests from older versions will be routed to the newer one, meaning they will fall back to SvelteKit's built-in skew protection.

## Notes

### Vercel functions

If you have Vercel functions contained in the `api` directory at the project's root, any requests for `/api/*` will _not_ be handled by SvelteKit. You should implement these as [API routes](routing#server) in your SvelteKit app instead, unless you need to use a non-JavaScript language in which case you will need to ensure that you don't have any `/api/*` routes in your SvelteKit app.

### Node version

Projects created before a certain date may default to using an older Node version than what SvelteKit currently requires. You can [change the Node version in your project settings](https://vercel.com/docs/concepts/functions/serverless-functions/runtimes/node-js#node.js-version).

## Troubleshooting

### Accessing the file system

You can't use `fs` in edge functions.

You _can_ use it in serverless functions, but it won't work as expected, since files are not copied from your project into your deployment. Instead, use the [`read`]($app-server#read) function from `$app/server` to access your files. It also works inside routes deployed as edge functions by fetching the file from the deployed public assets location.

Alternatively, you can [prerender](page-options#prerender) the routes in question.

### Deployment protection

If using [`read`]($app-server#read) in an edge function, SvelteKit will `fetch` the file in question from your deployment. If you are using [Deployment Protection](https://vercel.com/docs/deployment-protection), you must also enable [Protection Bypass for Automation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) so that the request does not result in a [401 Unauthorized](https://http.dog/401) response.
