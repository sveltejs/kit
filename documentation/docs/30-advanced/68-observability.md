---
title: Observability
---

<blockquote class="since note">
	<p>Available since 2.31</p>
</blockquote>

Sometimes, you may need to observe how your application is behaving in order to improve performance or find the root cause of a pesky bug. To help with this, SvelteKit can emit server-side [OpenTelemetry](https://opentelemetry.io) spans for the following:

- The [`handle`](hooks#handle) hook and `handle` functions running in a [`sequence`](@sveltejs-kit-hooks#sequence) (these will show up as children of each other and the root `handle` hook)
- Server [`load`](load) functions and universal `load` functions when they're run on the server
- [Form actions](form-actions)
- [Remote functions](remote-functions)

Just telling SvelteKit to emit spans won't get you far, though — you need to actually collect them somewhere to be able to view them. SvelteKit provides `src/instrumentation.server.ts` as a place to write your tracing setup and instrumentation code. If this file exists, it is loaded before your application code (provided your deployment platform supports it and your adapter is aware of it).

To enable SvelteKit's built-in span emission, set the `tracing.server` option of the SvelteKit plugin in your `vite.config.js` to `true`:

```js
/// file: vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			+++tracing: {
				server: true
			}+++
		})
	]
});
```

> [!NOTE] Tracing — and more significantly, observability instrumentation — can have a nontrivial overhead. Before you go all-in on tracing, consider whether or not you really need it, or if it might be more appropriate to turn it on in development and preview environments only.

## Augmenting the built-in tracing

SvelteKit provides access to the `root` span and the `current` span on the request event. The root span is the one associated with your root `handle` function, and the current span could be associated with `handle`, `load`, a form action, or a remote function, depending on the context. You can annotate these spans with any attributes you wish to record:

```js
/// file: #lib/authenticate.ts

// @filename: ambient.d.ts
declare module '#lib/auth-core.js' {
	export function getAuthenticatedUser(): Promise<{ id: string }>
}

// @filename: index.js
// ---cut---
import { getRequestEvent } from '$app/server';
import { getAuthenticatedUser } from '#lib/auth-core.js';

async function authenticate() {
	const user = await getAuthenticatedUser();
	const event = getRequestEvent();
	event.tracing.root.setAttribute('userId', user.id);
}
```

## Development quickstart

To view your first trace, you'll need to set up a local collector. We'll use [Jaeger](https://www.jaegertracing.io/docs/getting-started/) in this example, as they provide an easy-to-use quickstart command. Once your collector is running locally:

- Enable tracing as described earlier in your `vite.config.js` file, and create `src/instrumentation.server.js` (which SvelteKit will load automatically)
- Use your package manager to install the dependencies you'll need:
  ```sh
  npm i @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-proto import-in-the-middle
  ```
- Create `src/instrumentation.server.js` with the following:

```js
// @errors: 2307
/// file: src/instrumentation.server.js
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { register } from 'import-in-the-middle/register-hooks.mjs';

register();

const sdk = new NodeSDK({
	serviceName: 'test-sveltekit-tracing',
	traceExporter: new OTLPTraceExporter(),
	instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();
```

Now, server-side requests will begin generating traces, which you can view in Jaeger's web console at [localhost:16686](http://localhost:16686).

> [!NOTE] `import-in-the-middle/register-hooks.mjs` registers the loader via [`module.registerHooks()`](https://nodejs.org/api/module.html#moduleregisterhooksoptions), which runs the hooks synchronously on the application thread. This avoids the inter-thread message channel that the older `module.register()`-based setup required.
>
> The synchronous loader needs Node.js 22.22.3+, 24.11.1+, 25.1.0+, or 26.0.0+. `register()` will throw on older Node.js versions. If you need to support them, fall back to the asynchronous loader:
>
> ```js
> // @errors: 2307
> /// file: src/instrumentation.server.js
> import { NodeSDK } from '@opentelemetry/sdk-node';
> import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
> import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
> import { register, supportsSyncHooks } from 'import-in-the-middle/register-hooks.mjs';
> import { createAddHookMessageChannel } from 'import-in-the-middle';
> import { register as registerAsync } from 'node:module';
>
> if (supportsSyncHooks()) {
> 	register();
> } else {
> 	const { registerOptions } = createAddHookMessageChannel();
> 	registerAsync('import-in-the-middle/hook.mjs', import.meta.url, registerOptions);
> }
>
> const sdk = new NodeSDK({
> 	serviceName: 'test-sveltekit-tracing',
> 	traceExporter: new OTLPTraceExporter(),
> 	instrumentations: [getNodeAutoInstrumentations()]
> });
>
> sdk.start();
> ```
>
> The asynchronous `module.register()` API was deprecated in Node.js 25.9.0 and emits a runtime deprecation warning from 26.0.0, so prefer the synchronous path whenever your Node.js version supports it.

## `@opentelemetry/api`

SvelteKit uses `@opentelemetry/api` to generate its spans. This is declared as an optional peer dependency so that users not needing traces see no impact on install size or runtime performance. In most cases, if you're configuring your application to collect SvelteKit's spans, you'll end up installing a library like `@opentelemetry/sdk-node` or `@vercel/otel`, which in turn depend on `@opentelemetry/api`, which will satisfy SvelteKit's dependency as well. If you see an error from SvelteKit telling you it can't find `@opentelemetry/api`, it may just be because you haven't set up your trace collection yet. If you _have_ done that and are still seeing the error, you can install `@opentelemetry/api` yourself.

## Bundling caveats

OpenTelemetry auto-instrumentation generally works by intercepting imports and replacing or wrapping a module's exports with instrumented versions. This is what `import-in-the-middle` does in the example above. Because ESM module exports are immutable, the interceptor must be installed before the module being instrumented is evaluated. This is why `instrumentation.server.js` is a special entry point: SvelteKit arranges for it to run before it dynamically imports your application code. The intended order is:

1. `instrumentation.server.js` registers an interceptor for `my-database-library`
2. Your application imports `my-database-library`
3. The interceptor observes the import and returns the instrumented exports

Bundling can disrupt this in two ways.

First, a bundler may place code imported by `instrumentation.server.js` and application code in the same shared chunk. Importing that chunk to initialize instrumentation can then evaluate application code before the interceptor has been installed. By the time the application is dynamically imported, the module is already in the ESM module cache and it is too late to instrument it.

There is also an unavoidable chicken-and-egg limitation: initializing `$app/env/*` modules evaluates your `src/env.js` module and its dependencies. Instrumentation cannot intercept a module imported by `src/env`, because that module must run before `instrumentation.server.js` can start. Avoid importing anything from `src/env` that you need to instrument.

Second, a bundler may inline or transform the module you want to instrument. For example, it could replace this:

```js
// @errors: 2307 example library
import { query } from 'my-database-library';
```

with code embedded directly in an application chunk, or with an import such as `import { query } from './chunks/abc.js'`. At runtime there is no longer an import of `my-database-library` for the interceptor to observe. Tree-shaking and export rewriting can also change the shape of the module in ways that its OpenTelemetry instrumentation does not recognize.

SvelteKit automatically externalizes `@opentelemetry/api` so that its runtime and your instrumentation share the same module instance. If another library is not being instrumented as expected, tell Vite to leave that library out of the server bundle:

```js
/// file: vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		external: ['my-database-library']
	}
});
```

Externalization preserves the bare `my-database-library` import in the server output. Node.js then loads the package at runtime, after `instrumentation.server.js` has registered the interceptor, giving the instrumentation an opportunity to wrap it. Externalize the package being instrumented and any packages whose imports must remain visible to its instrumentation. Do not externalize application source files, and avoid externalizing dependencies indiscriminately, since doing so can change how they are resolved and deployed.

Dependencies needed at runtime must be listed in `dependencies`, rather than `devDependencies`, so that they are available in the deployed application. `adapter-node` also uses this distinction when it bundles the Vite output: it automatically keeps packages listed in `dependencies`, including their deep imports, external from that final bundle. You may still need `ssr.external` to prevent Vite from bundling a package during the earlier SSR build.

The other official adapters do not apply the same `dependencies`-based externalization rule themselves. Some adapters or deployment platforms perform their own tracing or bundling step, while others do not support runtime package imports at all. In those environments, Vite's `ssr.external` setting may not be sufficient or supported. Consult the adapter or platform documentation to verify that the dependency can remain external.
