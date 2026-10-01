## route_config_mismatch

> Mismatched route config for `%id%` — the `+page` and `+server` files must export the same config, if any

A route with both a page and an endpoint is deployed as a single unit, so adapters can only apply one [`config`](https://svelte.dev/docs/kit/page-options#config). Export the same `config` from both files, or from neither.
