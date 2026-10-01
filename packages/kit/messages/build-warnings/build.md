## adapter_missing

> No adapter specified. See https://svelte.dev/docs/kit/adapters to learn how to configure your app to run on the platform of your choosing

Adapters turn your build output into something you can deploy to a specific platform. Without one, `vite build` still builds your app, but doesn't produce a deployable app. Pass an adapter to the `sveltekit(...)` Vite plugin:

```js
/// file: vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-auto';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter()
		})
	]
});
```

## adapter_config_kit_deprecated

> Reading `config.kit` inside adapters is deprecated — it should access configuration on the `config` object directly. You may need to update your adapter

This warning comes from your adapter, not your app. SvelteKit options used to be nested under `config.kit`, but are now passed to adapters on `builder.config` directly. Update your adapter to the latest version. If you maintain it, replace `builder.config.kit.x` with `builder.config.x`.

## adapter_fallback_overwrites

> Overwriting `%file%` with fallback page. Consider using a different name for the fallback.

Your adapter's [fallback page](https://svelte.dev/docs/kit/single-page-apps) has the same name as a file that was already written, such as a prerendered page or a file in `static`, so that file is replaced. Choose a different name for the fallback, for example `200.html` rather than `index.html`.

## cors_preflight_continue

> `OPTIONS` request handlers will not work unless `%key%.preflightContinue` is set to `true`

Vite's CORS middleware answers `OPTIONS` requests itself, unless `preflightContinue` is `true`, in which case it passes them on to SvelteKit. Your Vite config sets [`%key%`](https://vite.dev/config/server-options#server-cors) in a way that stops `OPTIONS` handlers in `+server.js` files from running. Set `preflightContinue: true` in that option, or set it to `false` to disable Vite's CORS handling entirely.

## layout_children_missing

> `%file%`: `<slot />` or `{@render ...}` tag missing — inner content will not be rendered

A `+layout.svelte` wraps the pages and layouts below it, and has to render them somewhere. Add `{@render children()}` where the page content should appear:

```svelte
<!--- file: +layout.svelte --->
<script>
	let { children } = $props();
</script>

<nav>...</nav>

{@render children()}
```

## page_option_in_component

> `%file%`: `%option%` will be ignored — move it to `%fixed%` instead. See https://svelte.dev/docs/kit/page-options for more information.

[Page options](https://svelte.dev/docs/kit/page-options) such as `prerender`, `ssr`, `csr` and `trailingSlash` are read from `+page.js`, `+page.server.js`, `+layout.js` or `+layout.server.js`, not from the `.svelte` component. Move the export to one of those files.

## transform_index_html_unsupported

> The following plugins may not work correctly because they use the `transformIndexHtml` hook which is not supported:
> %plugins%

SvelteKit renders HTML itself, from `src/app.html`, rather than using an `index.html` file processed by Vite, so Vite's `transformIndexHtml` hook never runs for your pages. Plugins that rely on it to inject tags won't have any effect. Use [`transformPageChunk`](https://svelte.dev/docs/kit/hooks#handle) in your `handle` hook or edit `src/app.html` instead.

## vite_config_overridden

> The following Vite config options will be overridden by SvelteKit:
> %options%

SvelteKit controls these Vite options because its build depends on them, so your values are replaced. Remove them from your Vite config. SvelteKit usually provides its own option for the same purpose; see the [configuration reference](https://svelte.dev/docs/kit/configuration).

## prerender_redirect_location_missing

> `location` header missing on redirect received from `%path%`

While [prerendering](https://svelte.dev/docs/kit/page-options#prerender), this path responded with a 3xx status but no `location` header, so SvelteKit doesn't know where it redirects to and doesn't save it. Use [`redirect`](https://svelte.dev/docs/kit/@sveltejs-kit#redirect) from `@sveltejs/kit`, which sets the header for you, or add a `location` header to the response.
