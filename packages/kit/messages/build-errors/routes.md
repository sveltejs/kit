## route_escape_uppercase

> Character escape sequence in `%id%` must be lowercase

Route directories can contain [hexadecimal or unicode escape sequences](https://svelte.dev/docs/kit/advanced-routing#Encoding) such as `[x+3f]` or `[u+d83e]`, for characters that can't appear in a file name or have a special meaning in routes. The escape sequence, including its hexadecimal digits, must be lowercase — for example `[x+3f]` rather than `[X+3F]`.

## route_escape_invalid

> Invalid character escape sequence in `%id%`

An escape sequence in a route directory must contain hexadecimal digits, such as `[x+3f]` for `?` or `[u+2215]` for `∕`. See [encoding](https://svelte.dev/docs/kit/advanced-routing#Encoding) for the supported formats.

## route_escape_hex_length

> Hexadecimal escape sequence in `%id%` must be two characters

A hexadecimal escape sequence (`[x+nn]`) represents a single character using exactly two hexadecimal digits — for example `[x+23]` for `#`. For characters outside that range, use a unicode escape sequence such as `[u+2215]`. See [encoding](https://svelte.dev/docs/kit/advanced-routing#Encoding).

## route_escape_unicode_length

> Unicode escape sequence in `%id%` must be between four and six characters

A unicode escape sequence (`[u+nnnn]`) represents a code point using four to six hexadecimal digits — for example `[u+2215]` or `[u+1f600]`. Characters that fit in two digits can use a hexadecimal escape sequence such as `[x+23]` instead. See [encoding](https://svelte.dev/docs/kit/advanced-routing#Encoding).

## route_params_adjacent

> Invalid route `%id%` — parameters must be separated

Two [route parameters](https://svelte.dev/docs/kit/routing#page) can't appear directly next to each other, as in `[foo][bar]`, because there's no way to tell where one ends and the next begins. Separate them with static text, such as `[foo]-[bar]`, or put them in different directories, such as `[foo]/[bar]`.

## route_unbalanced_brackets

> Invalid route `%id%` — brackets are unbalanced

Every `[` in a route directory must have a matching `]`. Parameters are written as `[param]`, optional parameters as `[[param]]` and rest parameters as `[...rest]`. Check the directory names in the route for a missing or extra bracket.

## route_hash_character

> Route `%id%` should be renamed to %suggestion%

Directory names containing `#` can't be used in routes, because `#` marks the start of a URL's hash and breaks module resolution. Use the escape sequence `[x+23]` in its place. See [encoding](https://svelte.dev/docs/kit/advanced-routing#Encoding).

## route_optional_after_rest

> Invalid route `%id%` — an `[[optional]]` route segment cannot follow a `[...rest]` route segment

A [rest parameter](https://svelte.dev/docs/kit/advanced-routing#Rest-parameters) matches any number of segments, including none, so an [optional parameter](https://svelte.dev/docs/kit/advanced-routing#Optional-parameters) after it could never match anything. Remove the optional parameter, or move it before the rest parameter.

## route_optional_rest

> Invalid route `%id%` — a rest route segment is always optional, remove the outer square brackets

A [rest parameter](https://svelte.dev/docs/kit/advanced-routing#Rest-parameters) such as `[...rest]` already matches zero or more segments, so it can't also be wrapped in `[[...]]`. Rename `[[...rest]]` to `[...rest]`.

## route_param_invalid

> Invalid param: %param% in route `%id%`. Params and matcher names can only have underscores, hyphens, and alphanumeric characters.

Parameter names, and the names of [matchers](https://svelte.dev/docs/kit/advanced-routing#Matching) used as `[param=matcher]`, become property names on `params` and keys of the `params` export in `src/params.js`. They may only contain letters, digits, underscores and hyphens. To match other characters literally, use an [escape sequence](https://svelte.dev/docs/kit/advanced-routing#Encoding).

## route_server_file_hash_router

> Cannot use server-only files in an app with `router.type === 'hash'`: `%file%`

When [`router.type`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#router) is `'hash'`, the whole app is rendered in the browser from a single page, so there's no server to run `+page.server.js`, `+layout.server.js` or `+server.js` files. Move the logic to a universal `+page.js`/`+layout.js` file, or use the default `'pathname'` router.

## route_duplicate_files

> Multiple %type% files found in `%directory%` : `%existing%` and `%file%`

Each route directory can contain at most one file of each kind — one `+page.svelte`, one `+page.js`, one `+server.js` and so on. This usually happens when a file exists with two extensions, such as `+page.js` and `+page.ts`, or when two components reference different [layouts](https://svelte.dev/docs/kit/advanced-routing#Advanced-layouts), such as `+page.svelte` and `+page@.svelte`. Delete or rename one of the files.

## route_conflict

> The `%first%` and `%second%` routes conflict with each other

The two routes can match the same pathname, so SvelteKit can't decide which one should handle it. [Groups](https://svelte.dev/docs/kit/advanced-routing#Advanced-layouts) don't affect the pathname, so `/(a)/about` and `/(b)/about` both match `/about`. An [optional parameter](https://svelte.dev/docs/kit/advanced-routing#Optional-parameters) creates a route both with and without that segment. Rename or move one of the routes, or use a [matcher](https://svelte.dev/docs/kit/advanced-routing#Matching) to tell parameters apart.

## route_layout_segment_missing

> `%file%` references missing segment `%segment%`

A page or layout can [reset its layout hierarchy](https://svelte.dev/docs/kit/advanced-routing#Advanced-layouts-page) with `@segment` in its file name — for example `+page@item.svelte` uses the layout from the nearest parent directory called `item`. There's no parent directory with that name that contains a layout. Check the spelling, or use `@` on its own to use the root layout.

## routes_not_found

> No routes found. If you are using a custom `src/routes` directory, make sure it is specified in your SvelteKit Vite plugin options

The routes directory exists but doesn't contain any `+page`, `+layout`, `+error` or `+server` files. Add a `src/routes/+page.svelte`, or, if your routes are elsewhere, set [`files.routes`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#files) in the options you pass to the SvelteKit Vite plugin.

## route_prerender_page_and_endpoint

> Cannot prerender a route (`%id%`) with both a `+page.svelte` and a `%file%`

A route that has both a page and a `+server.js` endpoint uses content negotiation to decide which one to serve for each request. A prerendered route is saved as a single file, so there's no way to serve both. Move the endpoint to its own route, or stop [prerendering](https://svelte.dev/docs/kit/page-options#prerender) this one.

## route_file_reserved

> Files prefixed with `+` are reserved (saw `%file%`)

SvelteKit only recognises specific [route files](https://svelte.dev/docs/kit/routing), such as `+page.svelte`, `+page.js`, `+page.server.js`, `+layout.svelte`, `+error.svelte` and `+server.js`. Any other file in `src/routes` starting with `+` is reserved. Rename the file so it doesn't start with `+`, or fix the spelling of the route file name. Files including `.test.`, `.spec.` or `.stories.` are ignored.

## route_named_layout_in_module

> Only Svelte files can reference named layouts. Remove `%layout%` from `%name%` (at `%file%`)

[Resetting the layout](https://svelte.dev/docs/kit/advanced-routing#Advanced-layouts-page) with `@` is done on the component — `+page@.svelte` or `+layout@item.svelte`. Module files such as `+page.js` and `+layout.server.js` always belong to the component in the same directory, so their names can't contain `@`.

## param_matcher_missing

> No matcher found for parameter `%name%`

> No matcher found for parameter `%name%` in `%file%`

A route uses a parameter such as `[param=matcher]`, but no matcher with that name exists. Matchers are declared in `src/params.js` (or `src/params.ts`, or the file configured by [`files.params`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#files)) by exporting `params` from `defineParams`:

```js
/// file: src/params.js
import { defineParams } from '@sveltejs/kit/params';

export const params = defineParams({
	integer: (param) => (/^\d+$/.test(param) ? Number(param) : undefined)
});
```

See [matching](https://svelte.dev/docs/kit/advanced-routing#Matching).

## params_export_missing

> `%file%` does not export `params` from `defineParams`

The params file must export an object called `params`, created with `defineParams`, that contains your [matchers](https://svelte.dev/docs/kit/advanced-routing#Matching):

```js
/// file: src/params.js
import { defineParams } from '@sveltejs/kit/params';

export const params = defineParams({
	integer: (param) => (/^\d+$/.test(param) ? Number(param) : undefined)
});
```
