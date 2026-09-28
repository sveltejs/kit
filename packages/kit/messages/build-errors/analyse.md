## route_config_mismatch

> Mismatched route config for %id% — the +page and +server files must export the same config, if any

A route with both a page and an endpoint is deployed as a single unit, so adapters can only apply one [`config`](https://svelte.dev/docs/kit/page-options#config). Export the same `config` from both files, or from neither.

## router_hash_page_options

> Page options are ignored when `router.type === 'hash'` (%file% has %options%)

With the [hash router](https://svelte.dev/docs/kit/configuration#router), your app is a single page that's rendered entirely in the browser, so [page options](https://svelte.dev/docs/kit/page-options) such as `prerender`, `ssr` and `trailingSlash` have no effect. Remove them from the file, leaving only `load`.
