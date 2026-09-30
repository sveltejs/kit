## cookie_path_mismatch

> '%name%' cookie does not exist for %pathname%, but was previously set at %paths%. Did you mean to set its 'path' to '/' instead?

A cookie is only sent back for URLs inside its `path`. This cookie was set earlier with [`cookies.set`](https://svelte.dev/docs/kit/@sveltejs-kit#Cookies) and a more specific `path` — for example a relative path, or `path: ''`, which is resolved against the current route — so it isn't available here. To make a cookie available on every page, use the default `path: '/'`:

```js
cookies.set('session', id, { path: '/' });
```

This is only checked during development.

## cache_control_empty_directive

> `cache-control` header contains empty directives. (While parsing "%value%".)

The `cache-control` header passed to [`setHeaders`](https://svelte.dev/docs/kit/load#Headers) contains two commas in a row (or a trailing comma), which some browsers and CDNs handle inconsistently. Remove the extra comma. The header is still set. This is only checked during development.

## cache_control_invalid_directive

> Invalid cache-control directive "%directive%". Did you mean one of: %directives%? (While parsing "%value%".)

The `cache-control` header passed to [`setHeaders`](https://svelte.dev/docs/kit/load#Headers) contains a directive that isn't part of the [specification](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control), so browsers and CDNs will ignore it — often it's a typo, such as `maxage` instead of `max-age`. The header is still set. This is only checked during development.

## content_type_invalid

> Invalid content-type value "%type%". (While parsing "%value%".)

The `content-type` header passed to [`setHeaders`](https://svelte.dev/docs/kit/load#Headers) isn't a valid [media type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/MIME_types), which has the form `type/subtype` (such as `application/json`), optionally followed by parameters like `; charset=utf-8`. The header is still set. This is only checked during development.
