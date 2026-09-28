## adapter_read_unsupported

> Cannot use `read` from `$app/server` in %route% when using %adapter%. Please ensure that your adapter is up to date and supports this feature.

[`read`](https://svelte.dev/docs/kit/$app-server#read) reads assets from the filesystem at runtime, which not every deployment platform supports. Your adapter reports that it can't support `read` for this route. Update the adapter to the latest version, [prerender](https://svelte.dev/docs/kit/page-options#prerender) the route so that `read` only runs at build time, or import the asset with a regular `import` instead.

## adapter_generate_manifest_removed

> The `generateManifest` adapter API has been removed — use `generateServerInstance` or `builder.manifest` instead. You may need to update your adapter

This error comes from your adapter, not your app. Update the adapter to a version that supports this version of SvelteKit. If you maintain the adapter, see [writing adapters](https://svelte.dev/docs/kit/writing-adapters).

## adapter_instrumentation_file_missing

> %kind% %file% not found. This is probably a bug in your adapter.

Adapters that support [observability](https://svelte.dev/docs/kit/observability) call `builder.instrument(...)` with the paths of the server entry point, the instrumentation file and the file that initializes it. One of these files doesn't exist when the adapter calls `instrument`. Update your adapter; if you maintain it, check that it writes every file before calling `builder.instrument`. See [writing adapters](https://svelte.dev/docs/kit/writing-adapters).

## adapter_instrumentation_unsupported

> %file% is unsupported in %adapter%.

[`src/instrumentation.server.js`](https://svelte.dev/docs/kit/observability) has to be loaded before the rest of your server code, which the adapter must arrange for. The adapter you're using doesn't support this. Update it to the latest version, choose an adapter that supports instrumentation, or remove the file.
