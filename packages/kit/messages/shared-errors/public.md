## invalid_error_status

> HTTP error status codes must be between 400 and 599 — %status% is invalid

[`error`](https://svelte.dev/docs/kit/@sveltejs-kit#error) creates an [expected error](https://svelte.dev/docs/kit/errors#App-errors), which SvelteKit renders with its HTTP status code, so the status must be a client error (4xx) or server error (5xx) code such as `404` or `500`. Check the order of the arguments — the status comes first, then the message. To send the user somewhere else, use [`redirect`](https://svelte.dev/docs/kit/@sveltejs-kit#redirect) instead.

## invalid_redirect_status

> Redirect status codes must be between 300 and 308 — %status% is invalid

[`redirect`](https://svelte.dev/docs/kit/@sveltejs-kit#redirect) takes the status code as its first argument and the location as its second, for example `redirect(303, '/login')`. Use `303` after a form submission (the browser follows the redirect with a `GET` request), `307` for a temporary redirect that keeps the request method, or `308` for a permanent one. See [Redirects](https://svelte.dev/docs/kit/load#Redirects) for more.

## redirect_external_not_allowed

> Cannot redirect to external URL `%location%`. To redirect to an external URL, pass `{ external: true }` or an allowlist of permitted origins as the third argument to `redirect`

To protect against open redirects, [`redirect`](https://svelte.dev/docs/kit/@sveltejs-kit#redirect) only accepts locations on the current origin by default. Relative locations such as `'/login'` or `'../other'` are always allowed, but some strings that look relative — such as `'//example.com'` or `'\\example.com'` — are treated as absolute URLs by browsers, and so count as external too.

If you mean to leave your app, opt in explicitly, either with `{ external: true }` (which allows any external URL except `javascript:` and `data:` URLs) or with a list of the origins you trust:

```js
import { redirect } from '@sveltejs/kit';

redirect(307, 'https://example.com/docs', { external: ['https://example.com'] });
```

If the location comes from user input, such as a `?redirectTo=` query parameter, prefer an allowlist over `true`.

## redirect_external_javascript

> Cannot redirect to `%location%` with `{ external: true }`. The `javascript:` and `data:` protocols must be explicitly listed in the `external` allowlist

Redirecting to a `javascript:` or `data:` URL can run arbitrary code in the context of your app, so `{ external: true }` doesn't allow these protocols. Such redirects are rarely intended, so check where the location comes from. If you really need one, list the protocol explicitly, for example `{ external: ['javascript:'] }`.

## redirect_external_not_in_allowlist

> Cannot redirect to `%location%`: URL origin is not included in the `external` allowlist

The redirect location's origin — its protocol, host and port — must exactly match one of the entries passed as `external` to [`redirect`](https://svelte.dev/docs/kit/@sveltejs-kit#redirect). Paths are ignored, so list origins such as `'https://example.com'`. Note that `http:` and `https:`, or `example.com` and `www.example.com`, are different origins. Add the origin to the allowlist if the redirect is intended.

## redirect_external_option_invalid

> `redirect` `options.external` must be `true` or an array of allowed origins

The third argument of [`redirect`](https://svelte.dev/docs/kit/@sveltejs-kit#redirect) controls whether it may redirect to another origin. Pass `{ external: true }` to allow any external URL (except `javascript:` and `data:` URLs), or `{ external: ['https://example.com'] }` to allow specific origins. Omit the option if the location is on your own origin.

## app_stores_removed

> `$app/stores` has been removed in favour of `$app/state`

The store-based `$app/stores` module was removed in SvelteKit 3. Import `page`, `navigating` and `updated` from [`$app/state`](https://svelte.dev/docs/kit/$app-state) instead, and read them without the `$` prefix — for example `page.url.pathname` rather than `$page.url.pathname`. See the [migration guide](https://svelte.dev/docs/kit/migrating-to-sveltekit-3) for details.

## service_worker_module_outside_worker

> The `$app/service-worker` module can only be imported into a service worker

[`$app/service-worker`](https://svelte.dev/docs/kit/$app-service-worker) exports `self` typed as the service worker's global scope, which only exists inside a [service worker](https://svelte.dev/docs/kit/service-workers). Only import it from `src/service-worker` and the modules it imports — not from components, `load` functions or other code that runs in the page or on the server.

## match_in_service_worker

> Cannot use `match(...)` inside a service worker, as it depends on the SvelteKit client instance

[`match`](https://svelte.dev/docs/kit/$app-paths#match) resolves a URL to a route using the router of the running app, which doesn't exist inside a [service worker](https://svelte.dev/docs/kit/service-workers). The other `$app/paths` helpers, such as `asset` and `resolve`, do work there. Do the matching in the page instead, or compare URLs against the routes you care about yourself.

## resolve_params_missing

> Missing params for dynamic route ID `%id%`

When you pass a route ID containing parameters to [`resolve`](https://svelte.dev/docs/kit/$app-paths#resolve), the second argument must provide their values, for example `resolve('/blog/[slug]', { slug: 'hello-world' })`. To resolve a pathname rather than a route ID, omit the leading slash: `resolve('blog/hello-world')`.

## url_hash_unavailable

> Cannot access `event.url.hash`. Consider using `page.url.hash` inside a component instead

The hash (the part of the URL after `#`) is never sent to the server, so it isn't available to `load` functions or anything else that can run on the server. Read [`page.url.hash`](https://svelte.dev/docs/kit/$app-state#page) in a component instead, where it's available in the browser and updates when the hash changes.
