# adapter-cloudflare-workers

SvelteKit adapter that creates a Cloudflare Workers site using a function for dynamic server rendering.

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

Install with `npm i -D @sveltejs/adapter-cloudflare-workers@next`, then add the adapter to your `svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-cloudflare-workers';

export default {
	kit: {
		adapter: adapter()
	}
};
```

## Basic Configuration

**You will need [Wrangler](https://developers.cloudflare.com/workers/cli-wrangler/install-update) installed on your system**

This adapter expects to find a [wrangler.toml](https://developers.cloudflare.com/workers/platform/sites/configuration) file in the project root. It will determine where to write static assets and the worker based on the `site.bucket` and `build.upload` settings. These values must be set to the following:

```toml
[build.upload]
format = "modules"
dir = "./.svelte-kit/cloudflare"
main = "./_worker.mjs"

[site]
bucket = "./.svelte-kit/cloudflare-bucket"
```

To get started, generate this file using `wrangler` from your project directory

```sh
wrangler init --site my-site-name
```

Now you should get some details from Cloudflare. You should get your:

1. Account ID
2. And your Zone-ID (Optional)

Get them by visiting your [Cloudflare dashboard](https://dash.cloudflare.com) and click on any domain. There, you can scroll down and on the left, you can see your details under **API**.

Then configure your account-details in the config file:

```toml
name = "<your-site-name>"
type = "javascript"
account_id = "<your-account-id>"
workers_dev = true
route = ""
zone_id = ""

compatibility_date = "2022-02-09"

[build]
# Assume it's already been built. You can make this "npm run build" to ensure a build before publishing
command = ""

# All values below here are required by adapter-cloudflare-workers and should not change
[build.upload]
format = "modules"
dir = "./.svelte-kit/cloudflare"
main = "./_worker.mjs"

[site]
bucket = "./.svelte-kit/cloudflare-bucket"
```

Now, log in with wrangler:

```sh
wrangler login
```

Build your project and publish it:

```sh
npm run build && wrangler publish
```

**You are done!**

More info on configuring a cloudflare worker site can be found [here](https://developers.cloudflare.com/workers/platform/sites/start-from-existing)

## Changelog

[The Changelog for this package is available on GitHub](https://github.com/sveltejs/kit/blob/master/packages/adapter-cloudflare-workers/CHANGELOG.md).
