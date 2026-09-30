## invalid_export

> Invalid export `%key%` (valid exports are %exports%, or anything with a `'_'` prefix)

> Invalid export `%key%` in `%file%` (valid exports are %exports%, or anything with a `'_'` prefix)

SvelteKit reads specific exports from [route files](https://svelte.dev/docs/kit/routing) — such as `load`, [page options](https://svelte.dev/docs/kit/page-options) like `prerender` and `ssr`, `actions` in `+page.server.js` or HTTP method handlers in `+server.js` — and rejects anything else, so that a typo like `export const prerendr = true` doesn't silently do nothing. Check the spelling of the export. If it's a helper you only want to use inside the module, prefix its name with `_` or move it into a separate file.

## invalid_export_location

> Invalid export `%key%` (`%key%` is a valid export in %locations%)

> Invalid export `%key%` in `%file%` (`%key%` is a valid export in %locations%)

Each kind of [route file](https://svelte.dev/docs/kit/routing) supports a different set of exports. For example, `actions` can only be exported from `+page.server.js`, and HTTP method handlers such as `GET` only from `+server.js`. Move the export to one of the listed files.

## router_hash_page_options

> Page options are ignored when `router.type === 'hash'` (%source% has %options%)

With the [hash router](https://svelte.dev/docs/kit/configuration#router), your app is a single page that's rendered entirely in the browser, so [page options](https://svelte.dev/docs/kit/page-options) such as `prerender`, `ssr` and `trailingSlash` have no effect. Remove them from the file, leaving only `load`.
