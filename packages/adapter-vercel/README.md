# adapter-vercel

A SvelteKit adapter that creates a Vercel app.

If you're using [adapter-auto](../adapter-auto), you don't need to install this unless you need to specify Vercel-specific options, since it's already included.

## Usage

Add `"@sveltejs/adapter-vercel": "next"` to the `devDependencies` in your `package.json` and run `npm install`.

Then in your `svelte.config.js`:

```js
import vercel from '@sveltejs/adapter-vercel';

export default {
  kit: {
    // default options are shown
    adapter: vercel({
      // if true, will deploy the app using edge functions
      // (https://vercel.com/docs/concepts/functions/edge-functions)
      // rather than serverless functions
      edge: false,

      // an array of dependencies that esbuild should treat
      // as external when bundling functions
      external: [],

      // if true, will split your app into multiple functions
      // instead of creating a single one for the entire app
      split: false
    })
  }
};
```

## Environment Variables

Vercel makes a set of [deployment-specific environment variables](https://vercel.com/docs/concepts/projects/environment-variables#system-environment-variables) available. Like other environment variables, these are accessible from `$env/static/private` and `$env/dynamic/private` (sometimes — more on that later), and inaccessible from their public counterparts. To access one of these variables from the client:

```js
// +layout.server.js
import { VERCEL_COMMIT_REF } from '$env/static/private';

/** @type {import('./$types').LayoutServerLoad} */
export function load() {
  return {
    deploymentGitBranch: VERCEL_COMMIT_REF
  };
}
```

```svelte
<!-- +layout.svelte -->
<script>
  /** @type {import('./$types').LayoutServerData} */
	export let data;
</script>

<p>This staging environment was deployed from {data.deploymentGitBranch}.</p>
```

Since all of these variables are unchanged between build time and run time when building on Vercel, we recommend using `$env/static/private` — which will statically replace the variables, enabling optimisations like dead code elimination — rather than `$env/dynamic/private`. If you're deploying with `edge: true` you _must_ use `$env/static/private`, as `$env/dynamic/private` and `$env/dynamic/public` are not currently populated in edge functions on Vercel.

## Notes

### Vercel functions

Vercel functions contained in the `/api` directory at the project's root will _not_ be included in the deployment — these should be implemented as [server endpoints](https://kit.svelte.dev/docs/routing#server) in your SvelteKit app.

### Node version

Projects created before a certain date will default to using Node 14, while SvelteKit requires Node 16 or later. You can change that in your project settings:

![Vercel project settings](settings.png)

## Changelog

[The Changelog for this package is available on GitHub](https://github.com/sveltejs/kit/blob/master/packages/adapter-vercel/CHANGELOG.md).
