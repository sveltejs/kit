## app_template_missing

> %file% does not exist

SvelteKit renders every page using an app template, which lives at `src/app.html` by default. Create this file, or point [`files.appTemplate`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#files) at the template you want to use.

A minimal template looks like this:

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		%sveltekit.head%
	</head>
	<body>
		<div style="display: contents">%sveltekit.body%</div>
	</body>
</html>
```

## app_template_tag_missing

> %file% is missing `%tag%`

The app template must contain both `%sveltekit.head%` and `%sveltekit.body%`. SvelteKit replaces these placeholders with the page's `<head>` content (such as links, scripts and anything added with `<svelte:head>`) and with the rendered page markup.

Put `%sveltekit.head%` inside the `<head>` element and `%sveltekit.body%` inside the `<body>` element. Using a wrapper such as `<div style="display: contents">` for `%sveltekit.body%` stops browser extensions that inject elements into `<body>` from interfering with hydration.

## config_alias_key_invalid

> Invalid alias key: `%key%`

Each key in the deprecated [`alias`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#alias) option must be a non-empty, single-line string, optionally ending in `/*`. Prefer declaring [subpath imports](https://nodejs.org/api/packages.html#subpath-imports) in the `imports` field of your `package.json` instead.

## config_alias_value_invalid

> Invalid alias value: `%value%`

Each value in the deprecated [`alias`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#alias) option must be a non-empty, single-line path, optionally ending in `/*` or a file extension. Prefer declaring [subpath imports](https://nodejs.org/api/packages.html#subpath-imports) in the `imports` field of your `package.json` instead.

## config_app_dir_slash

> `%keypath%` cannot start or end with `'/'`

[`appDir`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#appDir) is a directory name relative to your base path, such as `_app` or `internal/app`. SvelteKit adds the surrounding slashes itself. Remove any leading or trailing `/`.

## config_csp_trusted_types_missing

> The `csp.directives['trusted-types']` option must include `'sveltekit-trusted-url'` when `serviceWorker.register` is `true`

When your [CSP](https://svelte.dev/docs/kit/@sveltejs-kit-vite#csp) enforces Trusted Types with `'require-trusted-types-for': ['script']`, SvelteKit registers your service worker through a Trusted Types policy called `sveltekit-trusted-url`. Add it to the allowed policies:

```js
csp: {
	directives: {
		'require-trusted-types-for': ['script'],
		'trusted-types': ['sveltekit-trusted-url']
	}
}
```

Alternatively, set [`serviceWorker.register`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#serviceWorker) to `false` and register the service worker yourself.

## config_csp_trusted_html_missing

> The `csp.directives['trusted-types']` option must include `'svelte-trusted-html'` unless all pages have `csr: false`

When your [CSP](https://svelte.dev/docs/kit/@sveltejs-kit-vite#csp) enforces Trusted Types with `'require-trusted-types-for': ['script']`, Svelte creates HTML through a Trusted Types policy called `svelte-trusted-html`. Add it to the allowed policies:

```js
csp: {
	directives: {
		'require-trusted-types-for': ['script'],
		'trusted-types': ['svelte-trusted-html']
	}
}
```

This isn't needed if no page is rendered in the browser, i.e. every page has [`csr = false`](https://svelte.dev/docs/kit/page-options#csr).

## config_empty_string

> `%keypath%` cannot be empty

This option must be a non-empty string. Provide a value, or remove the option to use its default.

## config_expected_boolean

> `%keypath%` should be true or false, if specified

This option only accepts a boolean. Pass `true` or `false`, or remove the option to use its default.

## config_expected_function

> `%keypath%` should be a function, if specified

This option only accepts a function. Pass a function, or remove the option to use its default.

## config_expected_number

> `%keypath%` should be a number, if specified

This option only accepts a number. Pass a number, or remove the option to use its default.

## config_expected_object

> `%keypath%` should be an object

This option groups related settings, so it must be a plain object (not an array or a primitive value). See the [configuration reference](https://svelte.dev/docs/kit/@sveltejs-kit-vite) for the settings it accepts.

## config_expected_one_of

> `%keypath%` should be %options%

This option only accepts one of the listed values. Use one of them, or remove the option to use the default (the first value in the list).

## config_expected_positive_integer

> `%keypath%` should be a positive integer, if specified

This option must be a whole number greater than or equal to `1`. For example, [`prerender.concurrency`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#prerender) is the number of pages that can be prerendered simultaneously.

## config_expected_string

> `%keypath%` should be a string, if specified

This option only accepts a string. Pass a string, or remove the option to use its default.

## config_expected_string_array

> `%keypath%` should be an array of strings, if specified

This option only accepts an array of strings, such as `['.svelte']` or `['*', '/about']`. Pass an array (even if it only has one member), or remove the option to use its default.

## config_extension_invalid

> File extensions must be alphanumeric — saw `'%extension%'`

Each member of [`extensions`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#extensions) must be a file extension made of letters and numbers, such as `.svelte` or `.svx`. Multi-part extensions such as `.svelte.md` are also allowed.

## config_extension_missing_dot

> Each member of %keypath% must start with `'.'` — saw `'%extension%'`

Write [`extensions`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#extensions) with a leading dot, for example `['.svelte', '.svx']` rather than `['svelte', 'svx']`.

## config_invalid_adapter

> The SvelteKit Vite plugin `%keypath%` should be an object with an `adapt` method

The `adapter` option expects the object returned by calling an adapter, not the adapter module or function itself. Make sure you call it:

```js
import adapter from '@sveltejs/adapter-auto';

sveltekit({
	adapter: adapter()
});
```

See [adapters](https://svelte.dev/docs/kit/adapters) for the available adapters and how to write your own.

## config_invalid_prerender_handler

> `%keypath%` should be `'fail'`, `'warn'`, `'ignore'` or a custom function

Prerender handlers decide what happens when SvelteKit encounters a problem while [prerendering](https://svelte.dev/docs/kit/@sveltejs-kit-vite#prerender). Use `'fail'` to stop the build, `'warn'` to log a message and continue, `'ignore'` to continue silently, or pass a function that receives details about the problem and decides for itself — for example by throwing to fail the build.

## config_kit_namespace

> SvelteKit configuration (%keys%) no longer lives inside a `kit` namespace. Pass it directly to the `sveltekit(...)` Vite plugin

In SvelteKit 3, options that used to live under `config.kit` in `svelte.config.js` are passed directly to the `sveltekit` Vite plugin, alongside options such as `compilerOptions`. Move them up a level:

```js
sveltekit({
	adapter: adapter(),
	compilerOptions: { runes: true }
});
```

See the [migration guide](https://svelte.dev/docs/kit/migrating-to-sveltekit-3#Configuration) for details.

## config_not_object

> The SvelteKit options from the Vite config must be an object

Pass an options object to the `sveltekit(...)` Vite plugin, for example `sveltekit({ adapter: adapter() })`. Omit the argument entirely to use the defaults. See the [configuration reference](https://svelte.dev/docs/kit/@sveltejs-kit-vite).

## config_option_removed

> The `%keypath%` option has been removed. Please see the list of breaking changes for your major release

This option no longer exists and is not needed any more. Remove it from your configuration. The [migration guide](https://svelte.dev/docs/kit/migrating-to-sveltekit-3#Configuration-Removed-options) lists removed options and what, if anything, replaces them.

## config_option_removed_check_origin

> `%keypath%` has been removed in favour of `csrf.trustedOrigins`

CSRF protection is always enabled in SvelteKit 3. Instead of disabling it with `checkOrigin: false`, list the external origins that are allowed to submit forms to your app in [`csrf.trustedOrigins`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#csrf):

```js
csrf: {
	trustedOrigins: ['https://payment-gateway.com'];
}
```

## config_option_removed_experimental_instrumentation

> `%keypath%` has been removed. `src/instrumentation.server.js` is now included in the build automatically when it exists; no opt-in is required

Remove the option. SvelteKit now picks up [`src/instrumentation.server.js`](https://svelte.dev/docs/kit/observability) automatically.

## config_option_removed_experimental_tracing

> `%keypath%` has been removed. Server-side tracing is now configured via `tracing.server`

Tracing is no longer experimental. Move the setting to the top-level [`tracing`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#tracing) option:

```js
tracing: {
	server: true;
}
```

## config_option_removed_files_lib

> `%keypath%` has been removed. Use `#lib` instead of `$lib`: https://svelte.dev/docs/kit/$lib

SvelteKit no longer generates a `$lib` alias. Declare a `#lib` [subpath import](https://svelte.dev/docs/kit/$lib) in the `imports` field of your `package.json` (pointing it at whichever directory you used for `files.lib`) and import from `#lib` instead.

## config_option_removed_preload_strategy

> `%keypath%` has been removed. `modulepreload` will always be used

`modulepreload` is now supported in every browser SvelteKit targets, so it is always used. Remove the option.

## config_option_removed_prerender_origin

> `%keypath%` has been removed in favour of `config.paths.origin`

Move the value to [`paths.origin`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#paths). Besides prerendering, it is used for CSRF checks when your app's public origin can't reliably be derived from request headers.

## config_option_removed_vite_plugin

> `%keypath%` has been removed. Pass `vite-plugin-svelte` options directly to the `sveltekit(...)` Vite plugin

Options for `vite-plugin-svelte`, such as `inspector`, are now passed to the `sveltekit` plugin next to SvelteKit's own options. SvelteKit forwards any options it doesn't recognise:

```js
sveltekit({
	adapter: adapter(),
	inspector: true
});
```

## config_origin_has_path

> `%keypath%` must be a valid origin — received `'%input%'` which contains a path, query, or hash. Use the bare origin `'%origin%'` instead

An origin is just the protocol, host and optional port of a URL, such as `https://my-site.com` or `http://localhost:3000`. To deploy your app under a sub-path, use [`paths.base`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#paths) instead.

## config_origin_invalid

> `%keypath%` must be a valid origin (e.g. 'https://my-site.com'). `'%input%'` could not be parsed as a URL

The origin must be an absolute URL including the protocol, such as `https://my-site.com` rather than `my-site.com`.

## config_origin_protocol

> `%keypath%` must be a valid origin — only 'http' and 'https' protocols are supported, received '%protocol%'

The origin describes where your app is publicly served, so it must use `http:` or `https:`.

## config_paths_assets_not_absolute

> `%keypath%` option must be an absolute path, if specified

[`paths.assets`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#paths) is for serving your app's files from a different origin, such as a CDN, so it must be a full URL like `https://cdn.example.com/my-app`. To serve your app from a sub-path of your own origin, use `paths.base` instead.

## config_paths_assets_trailing_slash

> `%keypath%` option must not end with `'/'`

Remove the trailing slash from [`paths.assets`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#paths) — for example use `https://cdn.example.com/my-app` rather than `https://cdn.example.com/my-app/`.

## config_paths_base_invalid

> `%keypath%` option must either be the empty string or a root-relative path that starts but doesn't end with `'/'`

[`paths.base`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#paths) is the sub-path your app is served from. Use `''` to serve it from the root, or a value like `/my-app` — with a leading slash and without a trailing one. It cannot be a full URL; use `paths.assets` to serve files from another origin.

## config_prerender_entry_invalid

> Each member of `%keypath%` must be either `'*'` or an absolute path beginning with `'/'` — saw `'%entry%'`

[`prerender.entries`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#prerender) lists pages to start prerendering from. Use `'*'` to include every route without required parameters, or paths such as `'/blog/hello-world'`, including the leading slash.

## config_server_resolution_bundle_strategy

> The `router.resolution` option cannot be `'server'` if `output.bundleStrategy` is `'inline'` or `'single'`

Server-side route resolution loads each route's code on demand, which requires the default `'split'` [bundle strategy](https://svelte.dev/docs/kit/@sveltejs-kit-vite#output). Either set `output.bundleStrategy` to `'split'`, or set [`router.resolution`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#router) to `'client'`.

## config_server_resolution_hash

> The `router.resolution` option cannot be `'server'` if `router.type` is `'hash'`

Hash-based routing happens entirely in the browser and never asks the server about navigations, so it can't use server-side route resolution. Either set [`router.type`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#router) to `'pathname'`, or set `router.resolution` to `'client'`.

## config_unexpected_option

> Unexpected option `%keypath%`

> Unexpected option `%keypath%` (did you mean `%suggestion%`?)

This option isn't recognised. Check for typos, and see the [configuration reference](https://svelte.dev/docs/kit/@sveltejs-kit-vite) for the supported options. The option may also have been removed or renamed in a new major version — check the [migration guide](https://svelte.dev/docs/kit/migrating-to-sveltekit-3#Configuration).
