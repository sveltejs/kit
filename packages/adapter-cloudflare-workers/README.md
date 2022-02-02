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

This adapter expects to find a [wrangler.toml](https://developers.cloudflare.com/workers/platform/sites/configuration) file in the project root. It will determine where to write static assets and the worker based on the `site.bucket` and `site.entry-point` settings.

Generate this file using `wrangler` from your project directory

```sh
wrangler init --site my-site-name
```

Now you should get some details from Cloudflare. You should get your:

1. Account ID
2. And your Zone-ID (Optional)

Get them by visiting your [Cloudflare dashboard](https://dash.cloudflare.com) and click on any domain. There, you can scroll down and on the left, you can see your details under **API**.

Then configure your sites build directory and your account-details in the config file:

```toml
account_id = 'YOUR ACCOUNT_ID'
zone_id    = 'YOUR ZONE_ID' # optional, if you don't specify this a workers.dev subdomain will be used.
site = {bucket = "./build", entry-point = "./workers-site"}

type = "javascript"

[build]
# Assume it's already been built. You can make this "npm run build" to ensure a build before publishing
command = ""

[build.upload]
format = "service-worker"
```

It's recommended that you add the `build` and `workers-site` folders (or whichever other folders you specify) to your `.gitignore`.

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
