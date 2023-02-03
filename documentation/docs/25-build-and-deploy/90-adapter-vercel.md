---
title: Vercel
---

To deploy to Vercel, use [`adapter-vercel`](https://github.com/sveltejs/kit/tree/master/packages/adapter-vercel).

This adapter will be installed by default when you use [`adapter-auto`](adapter-auto), but adding it to your project allows you to specify Vercel-specific options.

## Usage

Install with `npm i -D @sveltejs/adapter-vercel`, then add the adapter to your `svelte.config.js`:

```js
// @errors: 2307
/// file: svelte.config.js
import adapter from '@sveltejs/adapter-vercel';

export default {
	kit: {
		// default options are shown
		adapter: adapter({
			// default function config values. these can be overridden on a
			// per-route basis with `export const config` — see below
			defaultConfig: {
				runtime: 'nodejs18.x',
				regions: ['iad1'], // if runtime is `edge`, this defaults to `all`
				memory: 1024,
				maxDuration: undefined // 5s for Hobby plans, 15s for Pro, 30s for Enterprise
			},

			// an array of dependencies that esbuild should treat
			// as external when bundling functions. this only applies
			// to edge functions, and should only be used to exclude
			// optional dependencies that will not run outside Node
			external: [],

			// if true, will split your app into multiple functions
			// instead of creating a single one for each group of
			// routes that share the same configuration
			split: false
		})
	}
};
```

## Config options

Besides the config options shown above, the Vercel adapter also supports [route level config](/docs/page-options#config) through `export const config`. You can deploy parts of your app to the edge and others as serverless functions.

```js
/// file: about/+page.js
// Deploy the about page to the edge...
/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
	runtime: 'edge'
};
```

```js
/// file: admin/+layout.js
// ...and all admin pages to serverless
/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
	runtime: 'serverless'
};
```

Besides that, the following options are supported:
- [`runtime`](https://vercel.com/docs/build-output-api/v3#vercel-primitives/serverless-functions/configuration), [`regions`](https://vercel.com/docs/concepts/edge-network/regions), [`maxDuration`](https://vercel.com/docs/build-output-api/v3#vercel-primitives/serverless-functions/configuration) and [`memory`](https://vercel.com/docs/build-output-api/v3#vercel-primitives/serverless-functions/configuration) options for serverless functions
- [`regions`](https://vercel.com/docs/concepts/edge-network/regions) and [`envVarsInUse`](https://vercel.com/docs/build-output-api/v3#vercel-primitives/edge-functions/configuration) options for edge functions

You can set defaults through the adapter options and override them inside `+page/layout(.server).js` files using the [config](/docs/page-options#config) export.

Routes with the same config are bundled into one function, unless `split: true` is set.

## Environment Variables

Vercel makes a set of [deployment-specific environment variables](https://vercel.com/docs/concepts/projects/environment-variables#system-environment-variables) available. Like other environment variables, these are accessible from `$env/static/private` and `$env/dynamic/private` (sometimes — more on that later), and inaccessible from their public counterparts. To access one of these variables from the client:

```js
// @errors: 2305
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
/// file: +layout.svelte
<script>
	/** @type {import('./$types').LayoutServerData} */
	export let data;
</script>

<p>This staging environment was deployed from {data.deploymentGitBranch}.</p>
```

Since all of these variables are unchanged between build time and run time when building on Vercel, we recommend using `$env/static/private` — which will statically replace the variables, enabling optimisations like dead code elimination — rather than `$env/dynamic/private`. If you're deploying with `edge: true` you _must_ use `$env/static/private`, as `$env/dynamic/private` and `$env/dynamic/public` are not currently populated in edge functions on Vercel.

## Notes

### Vercel functions

If you have Vercel functions contained in the `api` directory at the project's root, any requests for `/api/*` will _not_ be handled by SvelteKit. You should implement these as [API routes](https://kit.svelte.dev/docs/routing#server) in your SvelteKit app instead, unless you need to use a non-JavaScript language in which case you will need to ensure that you don't have any `/api/*` routes in your SvelteKit app.

### Node version

Projects created before a certain date will default to using Node 14, while SvelteKit requires Node 16 or later. You can [change the Node version in your project settings](https://vercel.com/docs/concepts/functions/serverless-functions/runtimes/node-js#node.js-version).

## Troubleshooting

### Accessing the file system

You can't access the file system through methods like `fs.readFileSync` in Serverless/Edge environments. If you need to access files that way, do that during building the app through [prerendering](https://kit.svelte.dev/docs/page-options#prerender). If you have a blog for example and don't want to manage your content through a CMS, then you need to prerender the content (or prerender the endpoint from which you get it) and redeploy your blog everytime you add new content.
