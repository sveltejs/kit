# adapter-cloudflare-workers

SvelteKit adapter that creates a Cloudflare Workers site using a function for dynamic server rendering.

This is very experimental; the adapter API isn't at all fleshed out, and things will definitely change.

## Configuration

This adapter expects to find a [wrangler.toml](https://developers.cloudflare.com/workers/platform/sites/configuration) file in the project root. It will determine where to write static assets and the worker based on the `site.bucket` and `site.entry-point` settings.

Generate this file using `wrangler` from your project directory

```sh
$ wrangler init --site my-site-name
```

Then configure your sites build directory in the config file:

```toml
[site]
bucket = "./build"
entry-point = "./workers-site"
```

It's recommended that you add the `build` and `workers-site` folders (or whichever other folders you specify) to your `.gitignore`.

More info on configuring a cloudflare worker site can be found [here](https://developers.cloudflare.com/workers/platform/sites/start-from-existing)

## Changelog

[The Changelog for this package is available on GitHub](https://github.com/sveltejs/kit/blob/master/packages/adapter-cloudflare-workers/CHANGELOG.md).
